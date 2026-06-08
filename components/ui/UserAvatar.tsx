/**
 * Avatar de usuario
 * Imagen optimizada o iniciales con color determinístico por nombre.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Image } from 'expo-image';
import SquircleView from 'react-native-fast-squircle';
import { getOptimizedMediaUrl } from '../../lib/storage';

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

interface UserAvatarProps {
  uri: string | null | undefined;
  name: string;
  size?: number | 'sm' | 'md' | 'lg' | 'xl';
  borderRadius?: number;
}

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

  // Iniciales siempre visibles; la imagen se superpone y si falla queda el respaldo
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
      <Text
        style={[
          styles.initials,
          { fontSize, lineHeight: fontSize * 1.2 },
        ]}
      >
        {initials}
      </Text>

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
