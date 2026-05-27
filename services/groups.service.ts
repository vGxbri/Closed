import { mapGroupMemberWithProfile } from '../lib/memberProfile';
import { supabase } from '../lib/supabase';
import {
  CreateGroupInput,
  Group,
  GroupMemberView,
  GroupWithDetails,
  MemberRole,
  UpdateGroupInput,
} from '../types/database';

const GROUP_MEMBERS_WITH_PROFILE_SELECT = `
  *,
  profiles!group_members_user_id_fkey (
    display_name,
    username,
    avatar_url,
    bio
  )
`;

export const groupsService = {
  /**
   * Active members with group-specific display name and avatar resolved.
   */
  async fetchMembersForGroup(groupId: string): Promise<GroupMemberView[]> {
    const { data, error } = await supabase
      .from('group_members')
      .select(GROUP_MEMBERS_WITH_PROFILE_SELECT)
      .eq('group_id', groupId)
      .eq('is_active', true);

    if (error) throw error;

    return (data || []).map((row) =>
      mapGroupMemberWithProfile(row as Parameters<typeof mapGroupMemberWithProfile>[0]),
    ) as GroupMemberView[];
  },

  /**
   * Get all groups the current user belongs to
   */
  async getMyGroups(): Promise<GroupWithDetails[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get groups with member info
    const { data: memberships, error: memberError } = await supabase
      .from('group_members')
      .select(`
        role,
        group:groups (
          *
        )
      `)
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (memberError) throw memberError;

    // Get member counts and details for each group
    const groupsWithDetails = await Promise.all(
      (memberships || [])
        .filter(m => m.group && (m.group as unknown as Group).status !== 'deleted')
        .map(async (membership) => {
          const group = membership.group as unknown as Group;

          const members = await this.fetchMembersForGroup(group.id);

          // Get awards
          const { data: awards, error: awardsError } = await supabase
            .from('awards_with_stats')
            .select('*')
            .eq('group_id', group.id)
            .neq('status', 'archived');

          if (awardsError) throw awardsError;

          return {
            ...group,
            members: members || [],
            member_count: members?.length || 0,
            awards: awards || [],
            my_role: membership.role as MemberRole,
          };
        })
    );

    return groupsWithDetails;
  },

  /**
   * Get a group by ID with full details
   */
  async getGroupById(groupId: string): Promise<GroupWithDetails | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get the group
    const { data: group, error: groupError } = await supabase
      .from('groups')
      .select('*')
      .eq('id', groupId)
      .neq('status', 'deleted')
      .single();

    if (groupError) {
      if (groupError.code === 'PGRST116') return null; // Not found
      throw groupError;
    }

    // Get membership info
    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    const members = await this.fetchMembersForGroup(groupId);

    // Get awards
    const { data: awards, error: awardsError } = await supabase
      .from('awards_with_stats')
      .select('*')
      .eq('group_id', groupId)
      .neq('status', 'archived')
      .order('created_at', { ascending: false });

    if (awardsError) throw awardsError;

    return {
      ...group,
      members: members || [],
      member_count: members?.length || 0,
      awards: awards || [],
      my_role: membership?.role as MemberRole || null,
    };
  },

  /**
   * Create a new group
   */
  async createGroup(input: CreateGroupInput): Promise<Group> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('groups')
      .insert({
        name: input.name,
        description: input.description || null,
        icon: input.icon || 'trophy',
        cover_image_url: input.cover_image_url || null,
        category: input.category || 'Estándar',
        created_by: user.id,
        status: 'active',
        is_public: false,
        settings: {
          allow_member_nominations: false,
          allow_member_voting: true,
          max_members: 100,
          require_approval: false,
        },
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Update a group
   */
  async updateGroup(groupId: string, input: UpdateGroupInput): Promise<Group> {
    const { data, error } = await supabase
      .from('groups')
      .update(input)
      .eq('id', groupId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  /**
   * Upload group cover image and return public URL
   */
  async uploadGroupCover(groupId: string, uri: string): Promise<string> {
    const { decode } = await import('base64-arraybuffer');
    const FileSystem = await import('expo-file-system/legacy');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${groupId}/${Date.now()}.${fileExt}`;
    const contentType = fileExt === 'png' ? 'image/png' : 'image/jpeg';

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });

    const { error } = await supabase.storage
      .from('groups')
      .upload(fileName, decode(base64), { contentType, upsert: true });

    if (error) throw error;

    const { data } = supabase.storage.from('groups').getPublicUrl(fileName);
    return data.publicUrl;
  },

  /**
   * Delete a group (soft delete by changing status)
   */
  async deleteGroup(groupId: string): Promise<void> {
    const { data, error } = await supabase
      .from('groups')
      .update({ status: 'deleted' })
      .eq('id', groupId)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      throw new Error('No tienes permiso para eliminar este grupo o el grupo no existe');
    }
  },

  /**
   * Get a group by invite code
   */
  async getGroupByInviteCode(inviteCode: string): Promise<Group | null> {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .eq('invite_code', inviteCode.toUpperCase())
      .eq('status', 'active')
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data;
  },

  /**
   * Join a group using invite code
   */
  async joinGroup(inviteCode: string): Promise<Group> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Get the group
    const group = await this.getGroupByInviteCode(inviteCode);
    if (!group) throw new Error('Invalid invite code');

    // Check if already a member
    const { data: existing } = await supabase
      .from('group_members')
      .select('id, is_active')
      .eq('group_id', group.id)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      if (existing.is_active) {
        throw new Error('You are already a member of this group');
      }
      // Reactivate membership
      await supabase
        .from('group_members')
        .update({ is_active: true })
        .eq('id', existing.id);
    } else {
      // Create new membership
      const { error } = await supabase
        .from('group_members')
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: 'member',
          is_active: true,
        });

      if (error) throw error;
    }

    return group;
  },

  /**
   * Leave a group
   */
  async leaveGroup(groupId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if owner
    const { data: membership } = await supabase
      .from('group_members')
      .select('role')
      .eq('group_id', groupId)
      .eq('user_id', user.id)
      .single();

    if (membership?.role === 'owner') {
      throw new Error('Owner cannot leave the group. Transfer ownership first or delete the group.');
    }

    const { error } = await supabase
      .from('group_members')
      .update({ is_active: false })
      .eq('group_id', groupId)
      .eq('user_id', user.id);

    if (error) throw error;
  },

  /**
   * Update a member's role
   */
  async updateMemberRole(groupId: string, userId: string, role: MemberRole): Promise<void> {
    const { error } = await supabase
      .from('group_members')
      .update({ role })
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  /**
   * Transfer ownership to another member
   */
  async transferOwnership(groupId: string, newOwnerId: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // 1. Make the other user the new owner
    const { error: newOwnerError } = await supabase
      .from('group_members')
      .update({ role: 'owner' })
      .eq('group_id', groupId)
      .eq('user_id', newOwnerId);

    if (newOwnerError) throw newOwnerError;

    // 2. Demote current owner to admin
    const { error: demoteError } = await supabase
      .from('group_members')
      .update({ role: 'admin' })
      .eq('group_id', groupId)
      .eq('user_id', user.id);

    if (demoteError) throw demoteError;
  },

  /**
   * Remove a member from a group
   */
  async removeMember(groupId: string, userId: string): Promise<void> {
    const { error } = await supabase
      .from('group_members')
      .update({ is_active: false })
      .eq('group_id', groupId)
      .eq('user_id', userId);

    if (error) throw error;
  },

  /**
   * Regenerate the invite code for a group
   */
  async regenerateInviteCode(groupId: string): Promise<string> {
    // Generate new code
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let newCode = '';
    for (let i = 0; i < 6; i++) {
      newCode += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const { data, error } = await supabase
      .from('groups')
      .update({ invite_code: newCode })
      .eq('id', groupId)
      .select('invite_code')
      .single();

    if (error) throw error;
    return data.invite_code;
  },

  /**
   * Get group members
   */
  async getGroupMembers(groupId: string): Promise<GroupMemberView[]> {
    const { data, error } = await supabase
      .from('group_members_view')
      .select('*')
      .eq('group_id', groupId);

    if (error) throw error;
    return data || [];
  },

  /**
   * Update the current user's membership (e.g. group_display_name, group_avatar_url)
   */
  async updateMyMembership(groupId: string, updates: { group_display_name?: string | null; group_avatar_url?: string | null; group_bio?: string | null; }): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('group_members')
      .update(updates)
      .eq('group_id', groupId)
      .eq('user_id', user.id);

    if (error) throw error;
  },

  /**
   * Upload member avatar image and return public URL
   */
  async uploadMemberAvatar(groupId: string, uri: string): Promise<string> {
    const { decode } = await import('base64-arraybuffer');
    const FileSystem = await import('expo-file-system/legacy');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const fileExt = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const fileName = `${groupId}/avatars/${user.id}_${Date.now()}.${fileExt}`;
    const contentType = fileExt === 'png' ? 'image/png' : 'image/jpeg';

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: 'base64',
    });

    const { error } = await supabase.storage
      .from('groups')
      .upload(fileName, decode(base64), { contentType, upsert: true });

    if (error) throw error;

    const { data } = supabase.storage.from('groups').getPublicUrl(fileName);
    return data.publicUrl;
  },
};
