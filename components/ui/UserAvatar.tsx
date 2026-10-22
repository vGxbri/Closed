/**
 * Avatar de usuario
 * Imagen optimizada o, si no hay foto, un blob de Blobatar determinístico por semilla.
 */

import React, { useCallback, useMemo, useState } from "react";
import { StyleSheet } from "react-native";
import { Image } from "expo-image";
import SquircleView from "react-native-fast-squircle";
import { Blobatar } from "@blobatar/react-native";
import { _layout } from "blobatar";
import { getOptimizedMediaUrl } from "../../lib/storage";

const AVATAR_COLORS = [
  "#E57373",
  "#F06292",
  "#BA68C8",
  "#9575CD",
  "#7986CB",
  "#64B5F6",
  "#4FC3F7",
  "#4DD0E1",
  "#4DB6AC",
  "#81C784",
  "#AED581",
  "#DCE775",
  "#FFD54F",
  "#FFB74D",
  "#FF8A65",
  "#A1887F",
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function hashStringToIndex(str: string): number {
  return hashString(str) % AVATAR_COLORS.length;
}

/** Semilla del avatar de un miembro: distinta en cada grupo. */
export function getAvatarSeed(userId: string, groupId?: string | null): string {
  return groupId ? `${userId}:${groupId}` : userId;
}

/** Tono (0–359) del blob; sirve para colorear el nombre del miembro con el mismo color. */
export function getAvatarHue(seed: string): number {
  return hashString(seed || "Usuario") % 360;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export function getAvatarColor(name: string): string {
  return AVATAR_COLORS[hashStringToIndex(name || "Usuario")];
}

interface UserAvatarProps {
  uri: string | null | undefined;
  name: string;
  /** Semilla del blob (ver `getAvatarSeed`). Si falta, se usa el nombre. */
  seed?: string;
  size?: number | "sm" | "md" | "lg" | "xl";
  borderRadius?: number;
}

const UserAvatar = React.memo<UserAvatarProps>(
  ({ uri, name, seed, size = 48, borderRadius }) => {
    const [imageError, setImageError] = useState(false);

    const sizeValue = useMemo(() => {
      if (typeof size === "number") return size;
      switch (size) {
        case "sm":
          return 32;
        case "md":
          return 48;
        case "lg":
          return 64;
        case "xl":
          return 100;
        default:
          return 48;
      }
    }, [size]);

    const radius = borderRadius ?? sizeValue * 0.35;
    const blobSeed = seed || name || "Usuario";
    const hue = useMemo(() => getAvatarHue(blobSeed), [blobSeed]);
    const bgColor = useMemo(
      () => _layout(blobSeed, { hue }).palette.bg ?? getAvatarColor(name),
      [blobSeed, hue, name],
    );

    const handleImageError = useCallback(() => {
      setImageError(true);
    }, []);

    const hasValidImage = uri && uri.trim() !== "" && !imageError;

    // Blob siempre visible; la imagen se superpone y si falla queda el respaldo
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
        <Blobatar name={blobSeed} size={sizeValue} hue={hue} />

        {hasValidImage && (
          <Image
            source={
              getOptimizedMediaUrl(uri, {
                width: Math.max(100, sizeValue * 2),
              }) || uri
            }
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
  },
);

UserAvatar.displayName = "UserAvatar";
export { UserAvatar };

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
});
