import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import SquircleView from 'react-native-fast-squircle';
import { getOptimizedMediaUrl } from '../../lib/storage';

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
  /** Diameter in dp or a named size. Defaults to 48 (md). */
  size?: number | 'sm' | 'md' | 'lg' | 'xl';
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
  const [imageError, setImageError] = useState(false);

  const sizeValue = useMemo(() => {
    if (typeof size === 'number') return size;
    switch (size) {
      case 'sm': return 32;
      case 'md': return 48;
      case 'lg': return 64;
      case 'xl': return 100;
      default: return 48;
    }
  }, [size]);

  const radius = borderRadius ?? sizeValue * 0.35;
  const initials = useMemo(() => getInitials(name || 'Usuario'), [name]);
  const bgColor = useMemo(() => AVATAR_COLORS[hashStringToIndex(name || 'Usuario')], [name]);
  const fontSize = Math.round(sizeValue * 0.38);

  const handleImageError = useCallback(() => {
    setImageError(true);
  }, []);

  const hasValidImage = uri && uri.trim() !== '' && !imageError;

  // Always render initials as base layer; image overlays on top when available.
  // This ensures the avatar is NEVER empty, even if the image fails to load.
  return (
    <SquircleView
      style={[
        styles.container,
        {
          width: sizeValue,
          height: sizeValue,
          borderRadius: radius,
          backgroundColor: bgColor,
        },
      ]}
      cornerSmoothing={1}
    >
      {/* Initials — always rendered as fallback */}
      <Text
        style={[
          styles.initials,
          { fontSize, lineHeight: fontSize * 1.2 },
        ]}
      >
        {initials}
      </Text>

      {/* Image — overlays on top when a valid URI exists */}
      {hasValidImage && (
        <Image
          source={getOptimizedMediaUrl(uri, { width: Math.max(100, sizeValue * 2) }) || uri}
          style={[
            StyleSheet.absoluteFill,
            { width: sizeValue, height: sizeValue, borderRadius: radius },
          ]}
          contentFit="cover"
          transition={200}
          onError={handleImageError}
        />
      )}
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
