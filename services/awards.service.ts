/**
 * Servicio de premios (awards)
 * CRUD, nominaciones y votaciones de premios grupales vía Supabase.
 */

import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system/legacy';
import { resolveMemberProfileForGroup } from '../lib/memberProfile';
import { supabase } from '../lib/supabase';
import {
  Award,
  AwardStatus,
  AwardWithNominees,
  CreateAwardInput,
  Nominee,
  NomineeWithProfile,
  UpdateAwardInput,
} from '../types/database';

export const awardsService = {
  async getVotingPermissionContext(awardId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: award, error: awardError } = await supabase
      .from('awards')
      .select('group_id, vote_type, voting_settings')
      .eq('id', awardId)
      .single();

    if (awardError) throw awardError;

    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('settings')
      .eq('id', award.group_id)
      .single();

    if (groupError) throw groupError;

    const { data: membership, error: membershipError } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', award.group_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (membershipError) throw membershipError;

    const isAdmin = membership.role === 'owner' || membership.role === 'admin';
    const allowMemberVoting = !!group.settings?.allow_member_voting;
    if (!isAdmin && !allowMemberVoting) {
      throw new Error('La votación para miembros está desactivada en este grupo.');
    }

    return { user, award };
  },

  async getGroupAwards(groupId: string): Promise<Award[]> {
    const { data, error } = await supabase
      .from('awards')
      .select('*')
      .eq('group_id', groupId)
      .neq('status', 'archived')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getAwardById(awardId: string): Promise<AwardWithNominees | null> {
    const { data: award, error: awardError } = await supabase
      .from('awards')
      .select(`
        *,
        group:groups (*)
      `)
      .eq('id', awardId)
      .single();

    if (awardError) {
      if (awardError.code === 'PGRST116') return null;
      throw awardError;
    }

    const groupId = award.group_id as string;

    const { data: nominees, error: nomineesError } = await supabase
      .from('nominees')
      .select(`
        *,
        user:profiles!nominees_user_id_fkey (
          *,
          group_members!group_members_user_id_fkey(group_display_name, group_avatar_url, group_id)
        )
      `)
      .eq('award_id', awardId)
      .order('created_at', { ascending: true });

    if (nomineesError) throw nomineesError;

    return {
      ...award,
      nominees: (nominees || []).map((n) => {
        const rawUser = n.user as any;
        const resolved = resolveMemberProfileForGroup(rawUser, groupId);
        return {
          ...n,
          user: rawUser
            ? {
                ...rawUser,
                display_name: resolved?.display_name ?? rawUser.display_name,
                avatar_url: resolved ? resolved.avatar_url : rawUser.avatar_url,
              }
            : rawUser,
          is_winner: award.is_revealed ? n.is_winner : false,
        };
      }) as NomineeWithProfile[],
    };
  },

  async createAward(input: CreateAwardInput): Promise<Award> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: award, error: awardError } = await supabase
      .from('awards')
      .insert({
        group_id: input.group_id,
        name: input.name,
        description: input.description || null,
        icon: input.icon || 'trophy',
        vote_type: input.vote_type || 'person',
        status: 'draft',
        created_by: user.id,
        voting_settings: {
          nominees_can_vote: false,
          allow_self_vote: false,
          allow_vote_change: false,
          max_votes_per_user: 1,
          anonymous_voting: true,
          show_results_before_end: false,
          ...input.voting_settings,
        },
      })
      .select()
      .single();

    if (awardError) throw awardError;

    if (input.nominee_ids.length > 0) {
      const nomineesData = input.nominee_ids.map(userId => ({
        award_id: award.id,
        user_id: userId,
        nominated_by: user.id,
      }));

      const { error: nomineesError } = await supabase
        .from('nominees')
        .insert(nomineesData);

      if (nomineesError) throw nomineesError;
    }

    return award;
  },

  async updateAward(awardId: string, input: UpdateAwardInput): Promise<Award> {
    const { data, error } = await supabase
      .from('awards')
      .update(input)
      .eq('id', awardId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteAward(awardId: string): Promise<void> {
    const { error } = await supabase
      .from('awards')
      .delete()
      .eq('id', awardId);

    if (error) throw error;
  },

  async updateAwardStatus(awardId: string, status: AwardStatus, votingEndsAt?: string): Promise<Award> {
    const updates: Partial<Award> = { status };
    
    if (status === 'voting' && votingEndsAt) {
      updates.voting_end_at = votingEndsAt;
    }
    
    if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('awards')
      .update(updates)
      .eq('id', awardId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async addNominee(awardId: string, userId: string, reason?: string, contentUrl?: string): Promise<Nominee> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('nominees')
      .insert({
        award_id: awardId,
        user_id: userId,
        nominated_by: user.id,
        nomination_reason: reason || null,
        content_url: contentUrl || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async removeNominee(nomineeId: string): Promise<void> {
    const { error } = await supabase
      .from('nominees')
      .delete()
      .eq('id', nomineeId);

    if (error) throw error;
  },

  async vote(awardId: string, nomineeId: string): Promise<void> {
    const { user, award } = await this.getVotingPermissionContext(awardId);

    const votingSettings = award.voting_settings || {};

    // Premios tipo persona: aplicar restricciones de nominados y autovoto
    if (award.vote_type === 'person') {
      const { data: userNominee, error: checkError } = await supabase
        .from('nominees')
        .select('id')
        .eq('award_id', awardId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (checkError) throw checkError;

      if (userNominee) {
        if (!votingSettings.nominees_can_vote) {
          throw new Error('No puedes votar en este premio porque estás nominado.');
        }

        if (nomineeId === userNominee.id && !votingSettings.allow_self_vote) {
          throw new Error('No puedes votarte a ti mismo.');
        }
      }
    }

    if (votingSettings.allow_vote_change) {
      const { error } = await supabase
        .from('votes')
        .upsert({
          award_id: awardId,
          voter_id: user.id,
          nominee_id: nomineeId,
          points: 1,
        }, { 
          onConflict: 'award_id, voter_id' 
        });

      if (error) throw error;
    } else {
      const { data: existingVote, error: existingVoteError } = await supabase
        .from('votes')
        .select('id')
        .eq('award_id', awardId)
        .eq('voter_id', user.id)
        .maybeSingle();

      if (existingVoteError) throw existingVoteError;

      if (existingVote) {
        throw new Error('Ya has votado para este premio.');
      }

      const { error } = await supabase
        .from('votes')
        .insert({
          award_id: awardId,
          voter_id: user.id,
          nominee_id: nomineeId,
          points: 1,
        });

      if (error) {
        if (error.code === '23505') {
          throw new Error('Ya has votado para este premio.');
        }
        throw error;
      }
    }
  },

  async removeVote(awardId: string): Promise<void> {
    const { user, award } = await this.getVotingPermissionContext(awardId);

    const votingSettings = award.voting_settings || {};

    if (!votingSettings.allow_vote_change) {
      throw new Error('No se permite cambiar o retirar el voto en este premio.');
    }

    const { error } = await supabase
      .from('votes')
      .delete()
      .eq('award_id', awardId)
      .eq('voter_id', user.id);

    if (error) throw error;
  },

  async getMyVote(awardId: string): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('votes')
      .select('nominee_id')
      .eq('award_id', awardId)
      .eq('voter_id', user.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data?.nominee_id || null;
  },

  async declareWinner(awardId: string): Promise<Award> {
    const { data: nominees, error: nomineesError } = await supabase
      .from('nominees')
      .select('*')
      .eq('award_id', awardId)
      .order('vote_count', { ascending: false });

    if (nomineesError) throw nomineesError;

    if (!nominees || nominees.length === 0) {
      throw new Error('No se han encontrado nominados.');
    }

    const maxVotes = Math.max(...nominees.map(n => Number(n.vote_count) || 0));

    if (maxVotes > 0) {
      const winners = nominees.filter(n => (Number(n.vote_count) || 0) === maxVotes);
      const winnerIds = winners.map(n => n.id);

      const { error: updateError } = await supabase
        .from('nominees')
        .update({ is_winner: true })
        .in('id', winnerIds);
        
      if (updateError) throw updateError;

      const { data, error } = await supabase
        .from('awards')
        .update({
          winner_id: winners[0].user_id,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', awardId)
        .select()
        .single();

      if (error) throw error;
      return data;
    } else {
      // Sin votos: premio desierto
      const { data, error } = await supabase
        .from('awards')
        .update({
          winner_id: null,
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('id', awardId)
        .select()
        .single();

      if (error) throw error;
      return data;
    }
  },

  async revealWinner(awardId: string): Promise<Award> {
    const { data, error } = await supabase
      .from('awards')
      .update({ is_revealed: true })
      .eq('id', awardId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async uploadNomineeMedia(awardId: string, uri: string, mimeType?: string, originalFileName?: string): Promise<string> {
    const fileExt = originalFileName ? originalFileName.split('.').pop()?.toLowerCase() || 'bin' : uri.split('.').pop()?.toLowerCase() || 'bin';
    const fileName = `${awardId}/${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;

    let contentType = mimeType;
    // Inferir MIME desde extensión si falta o es octet-stream (común en Android)
    if (!contentType || contentType === 'application/octet-stream') {
       if (['jpg', 'jpeg', 'png', 'webp'].includes(fileExt)) contentType = `image/${fileExt === 'jpg' ? 'jpeg' : fileExt}`;
       else if (['mp4', 'mov', 'avi'].includes(fileExt)) contentType = `video/${fileExt === 'mov' ? 'quicktime' : fileExt}`;
       else if (['mp3', 'wav', 'm4a', 'aac', 'flac', 'ogg', 'wma'].includes(fileExt)) {
          if (fileExt === 'mp3') contentType = 'audio/mpeg';
          else if (fileExt === 'm4a') contentType = 'audio/mp4';
          else if (fileExt === 'wav') contentType = 'audio/wav';
          else if (fileExt === 'aac') contentType = 'audio/aac';
          else contentType = `audio/${fileExt}`;
       }
       else contentType = 'application/octet-stream';
    }

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });

    const { error } = await supabase.storage
      .from('awards')
      .upload(filePath, decode(base64), {
        contentType,
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from('awards')
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  async getAwardCounts(groupId: string): Promise<{ total: number; voting: number; draft: number; completed: number }> {
    const [totalResult, votingResult, draftResult, completedResult] = await Promise.all([
      supabase
        .from('awards')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .neq('status', 'archived'),
      supabase
        .from('awards')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .eq('status', 'voting'),
      supabase
        .from('awards')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .eq('status', 'draft'),
      supabase
        .from('awards')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .eq('status', 'completed'),
    ]);

    return {
      total: totalResult.count || 0,
      voting: votingResult.count || 0,
      draft: draftResult.count || 0,
      completed: completedResult.count || 0,
    };
  },

  async checkExpiration(awardId: string): Promise<void> {
    const { error } = await supabase.rpc('check_award_expiration', { 
      check_award_id: awardId 
    });
    
    if (error) throw error;
  },
};
