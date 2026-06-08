/**
 * Hook de grupos
 * Lista, detalle, creación y edición de grupos privados del usuario.
 */

import { useCallback, useEffect, useState } from 'react';
import { groupsService } from '../services/groups.service';
import { CreateGroupInput, GroupWithDetails, MemberRole, UpdateGroupInput } from '../types/database';

export function useGroups() {
  const [groups, setGroups] = useState<GroupWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchGroups = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await groupsService.getMyGroups();
      setGroups(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  const createGroup = async (input: CreateGroupInput) => {
    const newGroup = await groupsService.createGroup(input);
    await fetchGroups();
    return newGroup;
  };

  return {
    groups,
    isLoading,
    error,
    refetch: fetchGroups,
    createGroup,
  };
}

export function useGroup(groupId: string | undefined) {
  const [group, setGroup] = useState<GroupWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchGroup = useCallback(async () => {
    if (!groupId) {
      setGroup(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      const data = await groupsService.getGroupById(groupId);
      setGroup(data);
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  const updateGroup = async (input: UpdateGroupInput) => {
    if (!groupId) throw new Error('No group ID');
    const updated = await groupsService.updateGroup(groupId, input);
    setGroup(prev => prev ? { ...prev, ...updated } : null);
    return updated;
  };

  const deleteGroup = async () => {
    if (!groupId) throw new Error('No group ID');
    await groupsService.deleteGroup(groupId);
    setGroup(null);
  };

  const leaveGroup = async () => {
    if (!groupId) throw new Error('No group ID');
    await groupsService.leaveGroup(groupId);
    setGroup(null);
  };

  const updateMemberRole = async (userId: string, role: MemberRole) => {
    if (!groupId) throw new Error('No group ID');
    await groupsService.updateMemberRole(groupId, userId, role);
    await fetchGroup();
  };

  const removeMember = async (userId: string) => {
    if (!groupId) throw new Error('No group ID');
    await groupsService.removeMember(groupId, userId);
    await fetchGroup();
  };

  const regenerateInviteCode = async () => {
    if (!groupId) throw new Error('No group ID');
    const newCode = await groupsService.regenerateInviteCode(groupId);
    setGroup(prev => prev ? { ...prev, invite_code: newCode } : null);
    return newCode;
  };

  const updateMyMembership = async (updates: { group_display_name?: string | null; group_avatar_url?: string | null; group_bio?: string | null; }) => {
    if (!groupId) throw new Error('No group ID');
    await groupsService.updateMyMembership(groupId, updates);
    await fetchGroup();
  };

  const uploadMemberAvatar = async (uri: string) => {
    if (!groupId) throw new Error('No group ID');
    return await groupsService.uploadMemberAvatar(groupId, uri);
  };

  const transferOwnership = async (newOwnerId: string) => {
    if (!groupId) throw new Error('No group ID');
    await groupsService.transferOwnership(groupId, newOwnerId);
    await fetchGroup();
  };

  return {
    group,
    isLoading,
    error,
    refetch: fetchGroup,
    updateGroup,
    deleteGroup,
    leaveGroup,
    updateMemberRole,
    removeMember,
    regenerateInviteCode,
    updateMyMembership,
    uploadMemberAvatar,
    transferOwnership,
    isAdmin: group?.my_role === 'admin' || group?.my_role === 'owner',
    isOwner: group?.my_role === 'owner',
  };
}

export function useJoinGroup() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const joinGroup = async (inviteCode: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const group = await groupsService.joinGroup(inviteCode);
      return group;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const previewGroup = async (inviteCode: string) => {
    try {
      setIsLoading(true);
      setError(null);
      const group = await groupsService.getGroupByInviteCode(inviteCode);
      return group;
    } catch (err) {
      setError(err as Error);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    joinGroup,
    previewGroup,
    isLoading,
    error,
  };
}
