/**
 * Avatar de miembro
 * Muestra foto o iniciales y nombre de un perfil o miembro del grupo.
 */

import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { getMemberAvatarUrl, getMemberDisplayName } from '../lib/memberProfile';
import { GroupMemberView, Profile } from '../types/database';
import { Colors } from '../constants/Colors';
import { UserAvatar } from './ui/UserAvatar';

// Acepta perfil, miembro de grupo o filas con user_id (p. ej. SelectableMember)
type UserLike =
  | Profile
  | GroupMemberView
  | {
      id: string;
      display_name: string;
      avatar_url?: string | null;
      group_avatar_url?: string | null;
      group_display_name?: string | null;
    }
  | {
      user_id: string;
      display_name: string;
      avatar_url?: string | null;
      group_avatar_url?: string | null;
      group_display_name?: string | null;
    };

const getUserId = (user: UserLike): string =>
  'user_id' in user ? user.user_id : user.id;

interface MemberAvatarProps {
  user: UserLike;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
  style?: ViewStyle;
}

const getUserName = (user: UserLike): string => {
  if ('group_display_name' in user) {
    return getMemberDisplayName({
      display_name: user.display_name || 'Usuario',
      group_display_name: user.group_display_name,
    });
  }
  return user.display_name || 'Usuario';
};

export const MemberAvatar: React.FC<MemberAvatarProps> = ({
  user,
  size = 'md',
  showName = false,
  style,
}) => {
  const name = getUserName(user);
  const avatarUri =
    'group_avatar_url' in user
      ? getMemberAvatarUrl({
          avatar_url: user.avatar_url,
          group_avatar_url: user.group_avatar_url,
        })
      : user.avatar_url;

  return (
    <View style={[styles.container, style]}>
      <UserAvatar
        uri={avatarUri}
        name={name}
        size={size}
      />
      {showName && (
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
      )}
    </View>
  );
};

interface MemberAvatarsRowProps {
  users: UserLike[];
  max?: number;
  size?: 'sm' | 'md';
}

export const MemberAvatarsRow: React.FC<MemberAvatarsRowProps> = ({
  users,
  max = 5,
  size = 'sm',
}) => {
  const displayedUsers = users.slice(0, max);
  const remaining = users.length - max;
  const sizeValue = size === 'sm' ? 32 : 40;

  return (
    <View style={styles.row}>
      {displayedUsers.map((user, index) => (
        <View
          key={getUserId(user)}
          style={{
            marginLeft: index > 0 ? -10 : 0,
            zIndex: displayedUsers.length - index,
          }}
        >
          <MemberAvatar user={user} size={size} />
        </View>
      ))}
      {remaining > 0 && (
        <View
          style={[
            styles.remainingBadge,
            {
              width: sizeValue,
              height: sizeValue,
              borderRadius: sizeValue / 2,
              marginLeft: -10,
            },
          ]}
        >
          <Text style={styles.remainingText}>+{remaining}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  name: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.textSecondary,
    maxWidth: 60,
    textAlign: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  remainingBadge: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  remainingText: {
    color: Colors.textOnPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
});
