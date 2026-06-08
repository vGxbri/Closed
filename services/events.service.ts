/**
 * Servicio de eventos del calendario
 * Eventos y participantes de grupos en Supabase.
 */

import { eventOverlapsLocalDay } from "../lib/calendarMonthLayout";
import {
  profileWithGroupMembersSelect,
  resolveMemberProfileForGroup,
} from "../lib/memberProfile";
import { supabase } from "../lib/supabase";
import {
  CalendarEvent,
  CalendarEventWithDetails,
  CreateEventInput,
  GalleryImageWithUser,
  RsvpStatus
} from "../types/database";

class EventsService {
  async getGroupEvents(
    groupId: string,
    year: number,
    month: number, // 0-indexed (JS convention)
  ): Promise<CalendarEventWithDetails[]> {
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0, 23, 59, 59, 999);

    const { data, error } = await supabase
      .from("events")
      .select(
        `
        *,
        creator:profiles!events_created_by_profiles_fk(${profileWithGroupMembersSelect}),
        participants:event_participants(
          *,
          user:profiles!event_participants_user_id_profiles_fk(${profileWithGroupMembersSelect})
        )
      `,
      )
      .eq("group_id", groupId)
      .gte("starts_at", startOfMonth.toISOString())
      .lte("starts_at", endOfMonth.toISOString())
      .order("starts_at", { ascending: true });

    if (error) throw error;

    const enriched = await Promise.all(
      (data || []).map(async (event) => {
        const { count } = await supabase
          .from("event_gallery_links")
          .select("*", { count: "exact", head: true })
          .eq("event_id", event.id);

        const resolvedCreator = resolveMemberProfileForGroup(
          event.creator,
          groupId,
        );
        const resolvedParticipants = (event.participants || []).map(
          (p: any) => ({
            ...p,
            user: resolveMemberProfileForGroup(p.user, groupId),
          }),
        );

        return {
          ...event,
          creator: resolvedCreator,
          participants: resolvedParticipants,
          gallery_count: count || 0,
        } as CalendarEventWithDetails;
      }),
    );

    return enriched;
  }

  async getEvent(eventId: string): Promise<CalendarEventWithDetails | null> {
    const { data, error } = await supabase
      .from("events")
      .select(
        `
        *,
        creator:profiles!events_created_by_profiles_fk(${profileWithGroupMembersSelect}),
        participants:event_participants(
          *,
          user:profiles!event_participants_user_id_profiles_fk(${profileWithGroupMembersSelect})
        )
      `,
      )
      .eq("id", eventId)
      .single();

    if (error) {
      if (error.code === "PGRST116") return null;
      throw error;
    }

    const { count } = await supabase
      .from("event_gallery_links")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId);

    const resolvedCreator = resolveMemberProfileForGroup(
      data.creator,
      data.group_id,
    );
    const resolvedParticipants = (data.participants || []).map((p: any) => ({
      ...p,
      user: resolveMemberProfileForGroup(p.user, data.group_id),
    }));

    return {
      ...data,
      creator: resolvedCreator,
      participants: resolvedParticipants,
      gallery_count: count || 0,
    } as CalendarEventWithDetails;
  }

  async createEvent(input: CreateEventInput): Promise<CalendarEvent> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("events")
      .insert({
        group_id: input.group_id,
        title: input.title,
        description: input.description || null,
        location: input.location || null,
        starts_at: input.starts_at,
        ends_at: input.ends_at || null,
        is_all_day: input.is_all_day || false,
        color: input.color || "#6366F1",
        created_by: user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Excluir al creador de participantes para evitar clave duplicada
    if (input.participant_ids && input.participant_ids.length > 0) {
      const otherParticipantIds = input.participant_ids.filter(
        (id) => id !== user.id,
      );

      if (otherParticipantIds.length > 0) {
        const participantRows = otherParticipantIds.map((userId) => ({
          event_id: data.id,
          user_id: userId,
          status: "pending" as RsvpStatus,
          invited_by: user.id,
        }));

        const { error: partError } = await supabase
          .from("event_participants")
          .insert(participantRows);

        if (partError) throw partError;
      }
    }

    const { error: creatorError } = await supabase
      .from("event_participants")
      .insert({
        event_id: data.id,
        user_id: user.id,
        status: "accepted" as RsvpStatus,
        responded_at: new Date().toISOString(),
      });

    if (creatorError) throw creatorError;

    return data as CalendarEvent;
  }

  async updateEvent(
    eventId: string,
    updates: Partial<
      Pick<
        CalendarEvent,
        | "title"
        | "description"
        | "location"
        | "starts_at"
        | "ends_at"
        | "is_all_day"
        | "color"
      >
    >,
  ): Promise<void> {
    const { error } = await supabase
      .from("events")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", eventId);

    if (error) throw error;
  }

  async deleteEvent(eventId: string): Promise<void> {
    const { error } = await supabase.from("events").delete().eq("id", eventId);
    if (error) throw error;
  }

  async updateRsvp(eventId: string, status: RsvpStatus): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase
      .from("event_participants")
      .update({
        status,
        responded_at: new Date().toISOString(),
      })
      .eq("event_id", eventId)
      .eq("user_id", user.id);

    if (error) throw error;
  }

  async addParticipants(eventId: string, userIds: string[]): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const rows = userIds.map((userId) => ({
      event_id: eventId,
      user_id: userId,
      status: "pending" as RsvpStatus,
      invited_by: user.id,
    }));

    const { error } = await supabase.from("event_participants").upsert(rows, {
      onConflict: "event_id,user_id",
      ignoreDuplicates: true,
    });

    if (error) throw error;
  }

  async removeParticipant(eventId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from("event_participants")
      .delete()
      .eq("event_id", eventId)
      .eq("user_id", userId);

    if (error) throw error;
  }

  async getEventsForDate(
    groupId: string,
    date: Date,
  ): Promise<CalendarEventWithDetails[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("events")
      .select(
        `
        *,
        creator:profiles!events_created_by_profiles_fk(${profileWithGroupMembersSelect}),
        participants:event_participants(
          *,
          user:profiles!event_participants_user_id_profiles_fk(${profileWithGroupMembersSelect})
        )
      `,
      )
      .eq("group_id", groupId)
      .lte("starts_at", endOfDay.toISOString())
      .order("starts_at", { ascending: true });

    if (error) throw error;

    const overlapping = (data || []).filter((event) =>
      eventOverlapsLocalDay(event, date),
    );

    return overlapping.map((event) => {
      const resolvedCreator = resolveMemberProfileForGroup(
        event.creator,
        groupId,
      );
      const resolvedParticipants = (event.participants || []).map((p: any) => ({
        ...p,
        user: resolveMemberProfileForGroup(p.user, groupId),
      }));

      return {
        ...event,
        creator: resolvedCreator,
        participants: resolvedParticipants,
        gallery_count: 0,
      };
    }) as CalendarEventWithDetails[];
  }

  async getUpcomingEvents(
    groupId: string,
    limit: number = 3,
  ): Promise<CalendarEvent[]> {
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("group_id", groupId)
      .gte("starts_at", now)
      .order("starts_at", { ascending: true })
      .limit(limit);

    if (error) throw error;
    return (data || []) as CalendarEvent[];
  }

  async getMonthEventCount(groupId: string): Promise<number> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    const { count, error } = await supabase
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("group_id", groupId)
      .gte("starts_at", startOfMonth.toISOString())
      .lte("starts_at", endOfMonth.toISOString());

    if (error) return 0;
    return count || 0;
  }

  async autoLinkGalleryPhotos(
    groupId: string,
    eventId: string,
  ): Promise<number> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { data: event, error: eventError } = await supabase
      .from("events")
      .select("starts_at, ends_at, is_all_day")
      .eq("id", eventId)
      .single();

    if (eventError || !event) return 0;

    const startDate = new Date(event.starts_at);
    const endDate = event.ends_at
      ? new Date(event.ends_at)
      : new Date(event.starts_at);

    // Eventos de todo el día o sin fin: rango del día completo
    const rangeStart = new Date(startDate);
    rangeStart.setHours(0, 0, 0, 0);
    const rangeEnd = new Date(endDate);
    rangeEnd.setHours(23, 59, 59, 999);

    const { data: photos, error: photosError } = await supabase
      .from("gallery_images")
      .select("id")
      .eq("group_id", groupId)
      .gte("created_at", rangeStart.toISOString())
      .lte("created_at", rangeEnd.toISOString());

    if (photosError || !photos || photos.length === 0) return 0;

    const { data: existing } = await supabase
      .from("event_gallery_links")
      .select("gallery_image_id")
      .eq("event_id", eventId);

    const existingIds = new Set(
      (existing || []).map((e) => e.gallery_image_id),
    );

    const newPhotos = photos.filter((p) => !existingIds.has(p.id));
    if (newPhotos.length === 0) return 0;

    const links = newPhotos.map((p) => ({
      event_id: eventId,
      gallery_image_id: p.id,
      linked_by: user.id,
      is_auto_linked: true,
    }));

    const { error: linkError } = await supabase
      .from("event_gallery_links")
      .insert(links);

    if (linkError) return 0;

    return newPhotos.length;
  }

  async getEventGalleryImages(
    eventId: string,
  ): Promise<GalleryImageWithUser[]> {
    const { data, error } = await supabase
      .from("event_gallery_links")
      .select(
        `
        gallery_image:gallery_images(
          *,
          uploader:profiles!gallery_images_uploaded_by_profiles_fk(${profileWithGroupMembersSelect})
        )
      `,
      )
      .eq("event_id", eventId);

    if (error) throw error;

    const groupId = (
      data?.[0] as { gallery_image?: { group_id?: string } } | undefined
    )?.gallery_image?.group_id;

    return (data || [])
      .map((row: Record<string, unknown>) => row.gallery_image)
      .filter(Boolean)
      .map((image) => {
        const img = image as GalleryImageWithUser & { group_id?: string };
        const gid = img.group_id ?? groupId;
        if (!gid) return img;
        const resolved = resolveMemberProfileForGroup(img.uploader, gid);
        if (!resolved || !img.uploader) return img;
        return {
          ...img,
          uploader: { ...img.uploader, ...resolved },
        };
      }) as unknown as GalleryImageWithUser[];
  }

  async getGalleryImagesForDate(
    groupId: string,
    date: Date,
  ): Promise<GalleryImageWithUser[]> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const { data, error } = await supabase
      .from("gallery_images")
      .select(
        `
        *,
        uploader:profiles!gallery_images_uploaded_by_profiles_fk(${profileWithGroupMembersSelect})
      `,
      )
      .eq("group_id", groupId)
      .gte("created_at", startOfDay.toISOString())
      .lte("created_at", endOfDay.toISOString())
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((image) => {
      const resolved = resolveMemberProfileForGroup(image.uploader, groupId);
      if (!resolved || !image.uploader) return image;
      return {
        ...image,
        uploader: { ...image.uploader, ...resolved },
      };
    }) as unknown as GalleryImageWithUser[];
  }

  async linkGalleryImage(eventId: string, imageId: string): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { error } = await supabase.from("event_gallery_links").insert({
      event_id: eventId,
      gallery_image_id: imageId,
      linked_by: user.id,
      is_auto_linked: false,
    });

    if (error) throw error;
  }

  async unlinkGalleryImage(eventId: string, imageId: string): Promise<void> {
    const { error } = await supabase
      .from("event_gallery_links")
      .delete()
      .eq("event_id", eventId)
      .eq("gallery_image_id", imageId);

    if (error) throw error;
  }
}

export const eventsService = new EventsService();
