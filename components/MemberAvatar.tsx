import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { GroupMemberView, Profile } from '../types/database';
import { Colors } from '../constants/Colors';
import { UserAvatar } from './ui/UserAvatar';

// Accept either a Profile or a GroupMemberView (which has display_name instead of name)
type UserLike = Profile | GroupMemberView | { id: string; display_name: string; avatar_url?: string | null };

interface MemberAvatarProps {
  user: UserLike;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showName?: boolean;
  style?: ViewStyle;
}

const getUserName = (user: UserLike): string => {
  return user.display_name || 'Usuario';
};

export const MemberAvatar: React.FC<MemberAvatarProps> = ({
  user,
  size = 'md',
  showName = false,
  style,
}) => {
  const name = getUserName(user);

  return (
    <View style={[styles.container, style]}>
      <UserAvatar
        uri={user.avatar_url}
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

// Row of avatars with overlap
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
          key={user.id}
          style={[
            styles.avatarWrapper,
            { marginLeft: index > 0 ? -10 : 0, zIndex: displayedUsers.length - index },
          ]}
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
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  initials: {
    color: '#FFFFFF',
    fontWeight: '600',
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
  avatarWrapper: {
    // Individual wrapper for z-index
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
