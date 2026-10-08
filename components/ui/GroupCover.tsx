/**
 * Portada de grupo
 * Imagen de portada del grupo; sin imagen se muestra un color e iniciales derivados del nombre.
 */

import { Image } from "expo-image";
import React, { useState } from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { Text } from "react-native-paper";

import { getOptimizedMediaUrl } from "@/lib/storage";
import { getAvatarColor, getInitials } from "./UserAvatar";

interface GroupCoverProps {
  uri: string | null | undefined;
  name: string;
  /** Define el tamaño: la portada rellena lo que le dé este estilo. */
  style?: StyleProp<ViewStyle>;
}

export const GroupCover = React.memo<GroupCoverProps>(
  ({ uri, name, style }) => {
    const [imageError, setImageError] = useState(false);
    const hasImage = !!uri && uri.trim() !== "" && !imageError;

    return (
      <View
        style={[styles.cover, { backgroundColor: getAvatarColor(name) }, style]}
      >
        <Text style={styles.initials}>{getInitials(name)}</Text>
        {hasImage && (
          <Image
            source={getOptimizedMediaUrl(uri, { width: 800 }) || uri}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
            onError={() => setImageError(true)}
          />
        )}
      </View>
    );
  },
);

GroupCover.displayName = "GroupCover";

const styles = StyleSheet.create({
  cover: {
    justifyContent: "center",
    alignItems: "center",
  },
  initials: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 56,
    color: "rgba(255,255,255,0.9)",
  },
});
