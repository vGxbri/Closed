/**
 * Resolves display name and avatar for a user within a group context.
 * group_avatar_url: null → use global profile; '' → no photo; URL → group photo.
 */

export interface GroupMemberOverrides {
  group_id?: string;
  group_display_name?: string | null;
  group_avatar_url?: string | null;
}

export interface ProfileWithGroupMemberships {
  display_name: string;
  avatar_url?: string | null;
  group_members?: GroupMemberOverrides[];
}

export function resolveMemberAvatarUrl(
  globalAvatarUrl: string | null | undefined,
  groupAvatarUrl: string | null | undefined,
): string | null {
  if (groupAvatarUrl !== null && groupAvatarUrl !== undefined && groupAvatarUrl !== '') {
    return groupAvatarUrl;
  }
  return null;
}

export function resolveMemberDisplayName(
  globalDisplayName: string,
  groupDisplayName?: string | null,
): string {
  if (groupDisplayName && groupDisplayName.trim() !== '') {
    return groupDisplayName;
  }
  return globalDisplayName;
}

export function resolveMemberProfileForGroup(
  profile: ProfileWithGroupMemberships | null | undefined,
  groupId: string,
): { display_name: string; avatar_url: string | null } | null {
  if (!profile) return null;

  const groupMember = profile.group_members?.find((m) => m.group_id === groupId);

  return {
    display_name: resolveMemberDisplayName(
      profile.display_name,
      groupMember?.group_display_name,
    ),
    avatar_url: resolveMemberAvatarUrl(
      profile.avatar_url,
      groupMember?.group_avatar_url,
    ),
  };
}

/** Flat member row (e.g. GroupMemberView) with optional group overrides. */
export function getMemberAvatarUrl(member: {
  avatar_url?: string | null;
  group_avatar_url?: string | null;
}): string | null {
  return resolveMemberAvatarUrl(member.avatar_url, member.group_avatar_url);
}

export function getMemberDisplayName(member: {
  display_name: string;
  group_display_name?: string | null;
}): string {
  return resolveMemberDisplayName(member.display_name, member.group_display_name);
}

const PROFILE_WITH_GROUP_MEMBERS_SELECT = `
  display_name,
  avatar_url,
  group_members!group_members_user_id_fkey(group_display_name, group_avatar_url, group_id)
`;

export const profileWithGroupMembersSelect = PROFILE_WITH_GROUP_MEMBERS_SELECT;

/** DB row: group_members + nested profiles from Supabase join */
export type GroupMemberWithProfileRow = {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  invited_by?: string | null;
  joined_at: string;
  updated_at: string;
  group_display_name?: string | null;
  group_avatar_url?: string | null;
  group_bio?: string | null;
  profiles: {
    display_name: string;
    username: string | null;
    avatar_url: string | null;
    bio: string | null;
  };
};

export function mapGroupMemberWithProfile(
  row: GroupMemberWithProfileRow,
): {
  id: string;
  group_id: string;
  user_id: string;
  role: string;
  is_active: boolean;
  invited_by?: string | null;
  joined_at: string;
  updated_at: string;
  group_display_name?: string | null;
  group_avatar_url?: string | null;
  group_bio?: string | null;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  user_bio: string | null;
} {
  const { profiles: p, ...membership } = row;
  return {
    ...membership,
    display_name: resolveMemberDisplayName(
      p.display_name,
      membership.group_display_name,
    ),
    avatar_url: resolveMemberAvatarUrl(p.avatar_url, membership.group_avatar_url),
    username: p.username,
    user_bio: p.bio,
  };
}
