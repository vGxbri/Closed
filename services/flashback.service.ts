/**
 * Servicio de flashback
 * Fiestas retrospectivas y fotos colaborativas del grupo en Supabase.
 */

import { supabase } from '../lib/supabase';
import { uploadMediaToStorage } from '../lib/storage';
import { groupsService } from './groups.service';
import {
  FlashbackParty,
  FlashbackPartyStatus,
  FlashbackPartyWithDetails,
  FlashbackPhoto,
  FlashbackPhotoWithUser,
  CreateFlashbackPartyInput,
} from '../types/database';

const BUCKET = 'gallery';

class FlashbackService {
  computeStatus(party: FlashbackParty): FlashbackPartyStatus {
    const now = new Date();
    const starts = new Date(party.starts_at);
    const ends = new Date(party.ends_at);
    const reveals = new Date(party.reveals_at);
    // Archivar 12 h después de que termina la ventana de revelado
    const archiveAt = new Date(reveals.getTime() + 12 * 60 * 60 * 1000);

    if (now < starts) return 'scheduled';
    if (now >= archiveAt) return 'archived';
    if (now >= reveals) return 'revealing';
    if (now >= ends || party.status === 'film_used') return 'film_used';
    return 'active';
  }

  async syncPartyStatus(party: FlashbackParty): Promise<FlashbackPartyStatus> {
    const computed = this.computeStatus(party);
    if (computed !== party.status) {
      await supabase
        .from('flashback_parties')
        .update({ status: computed })
        .eq('id', party.id);

      if (computed === 'revealing') {
        this.copyPhotosToGallery(party.id, party.group_id).catch(() => {});
      }
    }
    return computed;
  }

  private async copyPhotosToGallery(partyId: string, groupId: string): Promise<void> {
    const { data: existing } = await supabase
      .from('gallery_images')
      .select('media_url')
      .eq('group_id', groupId)
      .like('media_url', `%flashback/${partyId}/%`);

    if (existing && existing.length > 0) return;

    const { data: photos, error } = await supabase
      .from('flashback_photos')
      .select('*')
      .eq('party_id', partyId)
      .order('shot_number', { ascending: true });

    if (error || !photos || photos.length === 0) return;

    const rows = photos.map((p: FlashbackPhoto) => ({
      group_id: groupId,
      uploaded_by: p.taken_by,
      media_url: p.photo_url,
      media_type: 'image' as const,
      caption: null,
    }));

    await supabase.from('gallery_images').insert(rows);
  }

  async getActiveParty(groupId: string): Promise<FlashbackPartyWithDetails | null> {
    const { data, error } = await supabase
      .from('flashback_parties')
      .select('*')
      .eq('group_id', groupId)
      .in('status', ['scheduled', 'active', 'film_used', 'revealing'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const synced = await this.syncPartyStatus(data as FlashbackParty);
    const party = { ...data, status: synced } as FlashbackParty;

    if (synced === 'archived') return null;

    return this.enrichParty(party, groupId);
  }

  async getPartyArchive(groupId: string): Promise<FlashbackPartyWithDetails[]> {
    const { data, error } = await supabase
      .from('flashback_parties')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    const parties: FlashbackPartyWithDetails[] = [];
    for (const raw of data) {
      const synced = await this.syncPartyStatus(raw as FlashbackParty);
      const p = { ...raw, status: synced } as FlashbackParty;
      if (synced === 'archived' || synced === 'revealing') {
        parties.push(await this.enrichParty(p, groupId));
      }
    }
    return parties;
  }

  async getPartyById(partyId: string): Promise<FlashbackPartyWithDetails | null> {
    const { data, error } = await supabase
      .from('flashback_parties')
      .select('*')
      .eq('id', partyId)
      .single();

    if (error) throw error;
    if (!data) return null;

    const party = data as FlashbackParty;
    const synced = await this.syncPartyStatus(party);
    return this.enrichParty({ ...party, status: synced }, party.group_id);
  }

  async createParty(input: CreateFlashbackPartyInput): Promise<FlashbackParty> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('flashback_parties')
      .insert({
        group_id: input.group_id,
        name: input.name,
        created_by: user.id,
        starts_at: input.starts_at,
        ends_at: input.ends_at,
        reveals_at: input.reveals_at,
        photo_limit: input.photo_limit ?? 36,
        status: 'scheduled',
      })
      .select()
      .single();

    if (error) throw error;
    return data as FlashbackParty;
  }

  async updatePartyStatus(partyId: string, status: FlashbackPartyStatus): Promise<void> {
    const { error } = await supabase
      .from('flashback_parties')
      .update({ status })
      .eq('id', partyId);

    if (error) throw error;
  }

  async getPartyPhotos(partyId: string): Promise<FlashbackPhotoWithUser[]> {
    const { data, error } = await supabase
      .from('flashback_photos')
      .select('*')
      .eq('party_id', partyId)
      .order('shot_number', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    const userIds = [...new Set(data.map((p: FlashbackPhoto) => p.taken_by))];
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, display_name, avatar_url')
      .in('id', userIds);

    if (profilesError) throw profilesError;

    const profileMap = new Map(
      (profiles || []).map((p: { id: string; display_name: string; avatar_url: string | null }) => [
        p.id,
        { display_name: p.display_name, avatar_url: p.avatar_url },
      ])
    );

    return data.map((photo: FlashbackPhoto) => ({
      ...photo,
      user: profileMap.get(photo.taken_by),
    }));
  }

  async getPhotoCount(partyId: string): Promise<number> {
    const { count, error } = await supabase
      .from('flashback_photos')
      .select('*', { count: 'exact', head: true })
      .eq('party_id', partyId);

    if (error) throw error;
    return count || 0;
  }

  async getActivityFeed(partyId: string, groupId: string): Promise<{ user_name: string; avatar_url: string | null; taken_at: string; photo_url: string }[]> {
    const { data, error } = await supabase
      .from('flashback_photos')
      .select('taken_by, created_at, photo_url')
      .eq('party_id', partyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    if (!data || data.length === 0) return [];

    const userIds = [...new Set(data.map((p: { taken_by: string }) => p.taken_by))];
    const { data: members } = await supabase
      .from('group_members_view')
      .select('user_id, display_name, avatar_url')
      .eq('group_id', groupId)
      .in('user_id', userIds);

    const memberMap = new Map(
      (members || []).map((m: { user_id: string; display_name: string; avatar_url: string | null }) => [
        m.user_id,
        { display_name: m.display_name, avatar_url: m.avatar_url },
      ])
    );

    return data.map((row: { taken_by: string; created_at: string; photo_url: string }) => ({
      user_name: memberMap.get(row.taken_by)?.display_name || 'Alguien',
      avatar_url: memberMap.get(row.taken_by)?.avatar_url || null,
      taken_at: row.created_at,
      photo_url: row.photo_url,
    }));
  }

  async takePhoto(partyId: string, photoUri: string): Promise<FlashbackPhoto> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const currentCount = await this.getPhotoCount(partyId);

    const { data: party } = await supabase
      .from('flashback_parties')
      .select('photo_limit, status')
      .eq('id', partyId)
      .single();

    if (!party || party.status !== 'active') {
      throw new Error('Party is not active');
    }

    if (currentCount >= party.photo_limit) {
      throw new Error('Film is used up');
    }

    const shotNumber = currentCount + 1;
    const fileName = `${shotNumber}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.jpg`;

    const result = await uploadMediaToStorage({
      bucket: BUCKET,
      folder: `flashback/${partyId}`,
      uri: photoUri,
      fileName,
      contentType: 'image/jpeg',
    });

    const { data: photo, error } = await supabase
      .from('flashback_photos')
      .insert({
        party_id: partyId,
        taken_by: user.id,
        photo_url: result.publicUrl,
        shot_number: shotNumber,
      })
      .select()
      .single();

    if (error) throw error;

    if (shotNumber >= party.photo_limit) {
      await this.updatePartyStatus(partyId, 'film_used');
    }

    return photo as FlashbackPhoto;
  }

  async getRemainingShots(partyId: string): Promise<number> {
    const [count, party] = await Promise.all([
      this.getPhotoCount(partyId),
      supabase
        .from('flashback_parties')
        .select('photo_limit')
        .eq('id', partyId)
        .single(),
    ]);

    if (party.error || !party.data) return 0;
    return Math.max(0, party.data.photo_limit - count);
  }

  async canTakePhoto(partyId: string): Promise<boolean> {
    const remaining = await this.getRemainingShots(partyId);
    if (remaining <= 0) return false;

    const { data } = await supabase
      .from('flashback_parties')
      .select('status')
      .eq('id', partyId)
      .single();

    return data?.status === 'active';
  }

  async getWidgetPreview(groupId: string): Promise<{
    hasParty: boolean;
    status: FlashbackPartyStatus | null;
    remaining: number;
    photoLimit: number;
    photosTaken: number;
    partyName: string | null;
    startsAt: string | null;
    endsAt: string | null;
    revealsAt: string | null;
  }> {
    const party = await this.getActiveParty(groupId);
    if (!party) {
      return { hasParty: false, status: null, remaining: 0, photoLimit: 36, photosTaken: 0, partyName: null, startsAt: null, endsAt: null, revealsAt: null };
    }
    const remaining = party.photo_limit - party.photos_count;
    return {
      hasParty: true,
      status: party.status,
      remaining,
      photoLimit: party.photo_limit,
      photosTaken: party.photos_count,
      partyName: party.name,
      startsAt: party.starts_at,
      endsAt: party.ends_at,
      revealsAt: party.reveals_at,
    };
  }

  async deleteParty(partyId: string): Promise<void> {
    const photos = await this.getPartyPhotos(partyId);

    if (photos.length > 0) {
      const storagePaths = photos.map((p) => {
        const marker = `/storage/v1/object/public/${BUCKET}/`;
        const parts = p.photo_url.split(marker);
        return parts.length === 2 ? parts[1] : null;
      }).filter(Boolean) as string[];

      if (storagePaths.length > 0) {
        await supabase.storage.from(BUCKET).remove(storagePaths);
      }

      const { error: photosError } = await supabase
        .from('flashback_photos')
        .delete()
        .eq('party_id', partyId);

      if (photosError) throw photosError;
    }

    const { error: partyError } = await supabase
      .from('flashback_parties')
      .delete()
      .eq('id', partyId);

    if (partyError) throw partyError;
  }

  private async enrichParty(party: FlashbackParty, groupId: string): Promise<FlashbackPartyWithDetails> {
    const [count, members] = await Promise.all([
      this.getPhotoCount(party.id),
      groupsService.fetchMembersForGroup(groupId),
    ]);

    const creator = members.find((m: { user_id: string }) => m.user_id === party.created_by);

    return {
      ...party,
      photos_count: count,
      creator: creator
        ? { display_name: creator.display_name, avatar_url: creator.avatar_url }
        : undefined,
    };
  }
}

export const flashbackService = new FlashbackService();
