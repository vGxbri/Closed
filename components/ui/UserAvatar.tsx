import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import SquircleView from 'react-native-fast-squircle';

// ─── Palette for initials-based avatars ──────────────────────────────────
const AVATAR_COLORS = [
  '#E57373', '#F06292', '#BA68C8', '#9575CD',
  '#7986CB', '#64B5F6', '#4FC3F7', '#4DD0E1',
  '#4DB6AC', '#81C784', '#AED581', '#DCE775',
  '#FFD54F', '#FFB74D', '#FF8A65', '#A1887F',
];

function hashStringToIndex(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % AVATAR_COLORS.length;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// ─── Props ──────────────────────────────────────────────────────────────
interface UserAvatarProps {
  /** Image URI (avatar_url). If falsy, renders initials. */
  uri: string | null | undefined;
  /** User's display name — used for initials and color. */
  name: string;
  /** Diameter in dp. Defaults to 48. */
  size?: number;
  /** Corner radius. Defaults to size/2 (circle). */
  borderRadius?: number;
}

// ─── Component ──────────────────────────────────────────────────────────
const UserAvatar = React.memo<UserAvatarProps>(({
  uri,
  name,
  size = 48,
  borderRadius,
}) => {
  const radius = borderRadius ?? size / 2;
  const initials = useMemo(() => getInitials(name), [name]);
  const bgColor = useMemo(() => AVATAR_COLORS[hashStringToIndex(name)], [name]);
  const fontSize = Math.round(size * 0.38);

  if (uri) {
    return (
      <SquircleView
        style={[
          styles.container,
          { width: size, height: size, borderRadius: radius },
        ]}
        cornerSmoothing={1}
      >
        <Image
          source={uri}
          style={{ width: size, height: size, borderRadius: radius }}
          contentFit="cover"
          transition={200}
        />
      </SquircleView>
    );
  }

  return (
    <SquircleView
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: radius,
          backgroundColor: bgColor,
        },
      ]}
      cornerSmoothing={1}
    >
      <Text
        style={[
          styles.initials,
          { fontSize, lineHeight: fontSize * 1.2 },
        ]}
      >
        {initials}
      </Text>
    </SquircleView>
  );
});

UserAvatar.displayName = 'UserAvatar';
export { UserAvatar };

// ─── Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontFamily: 'Archivo-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
