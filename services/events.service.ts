import { supabase } from '../lib/supabase';
import {
  CalendarEvent,
  CalendarEventWithDetails,
  CreateEventInput,
  EventParticipantWithProfile,
  GalleryImageWithUser,
  RsvpStatus,
} from '../types/database';

class EventsService {
  /**
   * Get all events for a group within a given month.
   */
  async getGroupEvents(
    groupId: string,
    year: number,
    month: number, // 0-indexed (JS convention)
  ): Promise<CalendarEventWithDetails[]> {
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        creator:profiles!events_created_by_profiles_fk(display_name, avatar_url),
        participants:event_participants(
          *,
          user:profiles!event_participants_user_id_profiles_fk(display_name, avatar_url)
        )
      `)
      .eq('group_id', groupId)
      .gte('starts_at', startOfMonth.toISOString())
      .lte('starts_at', endOfMonth.toISOString())
      .order('starts_at', { ascending: true });

    if (error) throw error;

    // Enrich with gallery count
    const enriched = await Promise.all(
      (data || []).map(async (event) => {
        const { count } = await supabase
          .from('event_gallery_links')
          .select('*', { count: 'exact', head: true })
          .eq('event_id', event.id);

        return {
          ...event,
          gallery_count: count || 0,
        } as CalendarEventWithDetails;
      }),
    );

    return enriched;
  }

  /**
   * Get a single event with full details.
   */
  async getEvent(eventId: string): Promise<CalendarEventWithDetails | null> {
    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        creator:profiles!events_created_by_profiles_fk(display_name, avatar_url),
        participants:event_participants(
          *,
          user:profiles!event_participants_user_id_profiles_fk(display_name, avatar_url)
        )
      `)
      .eq('id', eventId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw error;
    }

    const { count } = await supabase
      .from('event_gallery_links')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId);

    return {
      ...data,
      gallery_count: count || 0,
    } as CalendarEventWithDetails;
  }

  /**
   * Create a new event and optionally invite participants.
   */
  async createEvent(input: CreateEventInput): Promise<CalendarEvent> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('events')
      .insert({
        group_id: input.group_id,
        title: input.title,
        description: input.description || null,
        emoji: input.emoji || '📅',
        location: input.location || null,
        starts_at: input.starts_at,
        ends_at: input.ends_at || null,
        is_all_day: input.is_all_day || false,
        color: input.color || '#6366F1',
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Add participants if provided
    if (input.participant_ids && input.participant_ids.length > 0) {
      const participantRows = input.participant_ids.map((userId) => ({
        event_id: data.id,
        user_id: userId,
        status: 'pending' as RsvpStatus,
        invited_by: user.id,
      }));

      const { error: partError } = await supabase
        .from('event_participants')
        .insert(participantRows);

      if (partError) console.error('Error adding participants:', partError);
    }

    // Also add the creator as accepted participant
    const { error: creatorError } = await supabase
      .from('event_participants')
      .insert({
        event_id: data.id,
        user_id: user.id,
        status: 'accepted' as RsvpStatus,
        responded_at: new Date().toISOString(),
      });

    if (creatorError) console.error('Error adding creator as participant:', creatorError);

    return data as CalendarEvent;
  }

  /**
   * Update an existing event.
   */
  async updateEvent(
    eventId: string,
    updates: Partial<
      Pick<
        CalendarEvent,
        'title' | 'description' | 'emoji' | 'location' | 'starts_at' | 'ends_at' | 'is_all_day' | 'color'
      >
    >,
  ): Promise<void> {
    const { error } = await supabase
      .from('events')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', eventId);

    if (error) throw error;
  }

  /**
   * Delete an event.
   */
  async deleteEvent(eventId: string): Promise<void> {
    const { error } = await supabase.from('events').delete().eq('id', eventId);
    if (error) throw error;
  }

  /**
   * Update the current user's RSVP status.
   */
  async updateRsvp(eventId: string, status: RsvpStatus): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('event_participants')
      .update({
        status,
        responded_at: new Date().toISOString(),
      })
      .eq('event_id', eventId)
      .eq('user_id', user.id);

    if (error) throw error;
  }

  /**
   * Add participants to an event.
   */
  async addParticipants(eventId: string, userIds: string[]): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const rows = userIds.map((userId) => ({
      event_id: eventId,
      user_id: userId,
      status: 'pending' as RsvpStatus,
      invited_by: user.id,
    }));

    const { error } = await supabase.from('event_participants').upsert(rows, {
      onConflict: 'event_id,user_id',
      ignoreDuplicates: true,
    });

    if (error) throw error;
  }

  /**
   * Remove a participant from an event.
   */
  async removeParticipant(eventId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('event_participants')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  /**
   * Get events for a specific date (for the calendar day view).
   */
  async getEventsForDate(
    groupId: string,
    date: Date,
  ): Promise<CalendarEventWithDetails[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        creator:profiles!events_created_by_profiles_fk(display_name, avatar_url),
        participants:event_participants(
          *,
          user:profiles!event_participants_user_id_profiles_fk(display_name, avatar_url)
        )
      `)
      .eq('group_id', groupId)
      .gte('starts_at', startOfDay.toISOString())
      .lte('starts_at', endOfDay.toISOString())
      .order('starts_at', { ascending: true });

    if (error) throw error;

    return (data || []).map((event) => ({
      ...event,
      gallery_count: 0,
    })) as CalendarEventWithDetails[];
  }

  /**
   * Get upcoming events for the widget preview card.
   */
  async getUpcomingEvents(
    groupId: string,
    limit: number = 3,
  ): Promise<CalendarEvent[]> {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('group_id', groupId)
      .gte('starts_at', now)
      .order('starts_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return (data || []) as CalendarEvent[];
  }

  /**
   * Get the count of events for this month (for widget card).
   */
  async getMonthEventCount(groupId: string): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const { count, error } = await supabase
      .from('events')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId)
      .gte('starts_at', startOfMonth.toISOString())
      .lte('starts_at', endOfMonth.toISOString());

    if (error) return 0;
    return count || 0;
  }

  /**
   * Auto-link gallery photos that were uploaded on the same day as an event.
   */
  async autoLinkGalleryPhotos(groupId: string, eventId: string): Promise<number> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get the event's date range
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('starts_at, ends_at, is_all_day')
      .eq('id', eventId)
      .single();

    if (eventError || !event) return 0;

    const startDate = new Date(event.starts_at);
    const endDate = event.ends_at ? new Date(event.ends_at) : new Date(event.starts_at);

    // For all-day events or events without end, use the full day
    const rangeStart = new Date(startDate);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(endDate);
    rangeEnd.setHours(23, 59, 59, 999);

    // Find photos uploaded in this date range
    const { data: photos, error: photosError } = await supabase
      .from('gallery_images')
      .select('id')
      .eq('group_id', groupId)
      .gte('created_at', rangeStart.toISOString())
      .lte('created_at', rangeEnd.toISOString());

    if (photosError || !photos || photos.length === 0) return 0;

    // Get already-linked photo IDs for this event
    const { data: existing } = await supabase
      .from('event_gallery_links')
      .select('gallery_image_id')
      .eq('event_id', eventId);

    const existingIds = new Set((existing || []).map((e) => e.gallery_image_id));

    // Filter out already-linked photos
    const newPhotos = photos.filter((p) => !existingIds.has(p.id));
    if (newPhotos.length === 0) return 0;

    // Insert links
    const links = newPhotos.map((p) => ({
      event_id: eventId,
      gallery_image_id: p.id,
      linked_by: user.id,
      is_auto_linked: true,
    }));

    const { error: linkError } = await supabase
      .from('event_gallery_links')
      .insert(links);

    if (linkError) {
      console.error('Error auto-linking gallery photos:', linkError);
      return 0;
    }

    return newPhotos.length;
  }

  /**
   * Get gallery images linked to an event.
   */
  async getEventGalleryImages(eventId: string): Promise<GalleryImageWithUser[]> {
    const { data, error } = await supabase
      .from('event_gallery_links')
      .select(`
        gallery_image:gallery_images(
          *,
          uploader:profiles!gallery_images_uploaded_by_profiles_fk(display_name, avatar_url)
        )
      `)
      .eq('event_id', eventId);

    if (error) throw error;

    return (data || [])
      .map((row: Record<string, unknown>) => row.gallery_image)
      .filter(Boolean) as unknown as GalleryImageWithUser[];
  }

  /**
   * Get gallery images for a specific date (for the calendar day view photos row).
   */
  async getGalleryImagesForDate(
    groupId: string,
    date: Date,
  ): Promise<GalleryImageWithUser[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from('gallery_images')
      .select(`
        *,
        uploader:profiles!gallery_images_uploaded_by_profiles_fk(display_name, avatar_url)
      `)
      .eq('group_id', groupId)
      .gte('created_at', startOfDay.toISOString())
      .lte('created_at', endOfDay.toISOString())
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as unknown as GalleryImageWithUser[];
  }

  /**
   * Manually link a gallery image to an event.
   */
  async linkGalleryImage(eventId: string, imageId: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('event_gallery_links')
      .insert({
        event_id: eventId,
        gallery_image_id: imageId,
        linked_by: user.id,
        is_auto_linked: false,
      });

    if (error) throw error;
  }

  /**
   * Unlink a gallery image from an event.
   */
  async unlinkGalleryImage(eventId: string, imageId: string): Promise<void> {
    const { error } = await supabase
      .from('event_gallery_links')
      .delete()
      .eq('event_id', eventId)
      .eq('gallery_image_id', imageId);

    if (error) throw error;
  }
}

export const eventsService = new EventsService();
