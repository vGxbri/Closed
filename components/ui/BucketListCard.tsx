/**
 * Tarjeta de bucket list
 * Ítem del wishlist del grupo con categoría, imagen y estado completado.
 */

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import React, { useCallback, useMemo } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Text, useTheme } from "react-native-paper";
import Animated, { FadeInDown } from "react-native-reanimated";

import { BucketListItem, BucketListCategory } from "../../types/database";

const CATEGORY_ICONS: Record<BucketListCategory, keyof typeof Ionicons.glyphMap> = {
  restaurants: "restaurant-outline",
  travel: "airplane-outline",
  movies: "film-outline",
  gifts: "gift-outline",
  other: "bulb-outline",
};

interface BucketListCardProps {
  item: BucketListItem;
  index: number;
  onToggleComplete: (itemId: string, currentlyCompleted: boolean) => void;
  onPress: (item: BucketListItem) => void;
  onLongPress: (item: BucketListItem) => void;
}

export const BucketListCard = React.memo<BucketListCardProps>(
  ({ item, index, onToggleComplete, onPress, onLongPress }) => {
    const theme = useTheme();

    const categoryIcon = useMemo(
      () => CATEGORY_ICONS[item.category] || "bulb-outline",
      [item.category]
    );

    const handleToggle = useCallback(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onToggleComplete(item.id, item.is_completed);
    }, [item.id, item.is_completed, onToggleComplete]);

    const handlePress = useCallback(() => {
      onPress(item);
    }, [item, onPress]);

    const handleLongPress = useCallback(() => {
      onLongPress(item);
    }, [item, onLongPress]);

    const hasImage = !!item.image_url;
    const isCompleted = item.is_completed;

    return (
      <Animated.View
        entering={FadeInDown.duration(350).delay(80 + index * 50)}
      >
        <Pressable
          onPress={handlePress}
          onLongPress={handleLongPress}
          delayLongPress={500}
          style={({ pressed }) => [
            {
              opacity: pressed ? 0.92 : isCompleted ? 0.7 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          <SquircleView
            style={[
              styles.card,
              {
                backgroundColor: hasImage
                  ? "transparent"
                  : theme.colors.surface,
                borderColor: isCompleted
                  ? theme.colors.primary
                  : theme.colors.outlineVariant,
                borderWidth: isCompleted ? 1.5 : hasImage ? 0 : 1,
              },
            ]}
            cornerSmoothing={1}
          >
            {hasImage && (
              <>
                <Image
                  source={{ uri: item.image_url! }}
                  style={StyleSheet.absoluteFillObject}
                  contentFit="cover"
                  transition={300}
                />
                <View
                  style={[
                    StyleSheet.absoluteFillObject,
                    {
                      backgroundColor: "rgba(0,0,0,0.45)",
                      borderRadius: 20,
                    },
                  ]}
                />
              </>
            )}

            <View style={styles.cardContent}>
              <Pressable onPress={handleToggle} hitSlop={8}>
                <SquircleView
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: isCompleted
                        ? theme.colors.primary
                        : "transparent",
                      borderColor: isCompleted
                        ? theme.colors.primary
                        : hasImage
                          ? "rgba(255,255,255,0.5)"
                          : theme.colors.outline,
                      borderWidth: isCompleted ? 0 : 2,
                    },
                  ]}
                  cornerSmoothing={1}
                >
                  {isCompleted && (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                  )}
                </SquircleView>
              </Pressable>

              <View style={styles.textBlock}>
                <Text
                  style={[
                    styles.title,
                    {
                      color: hasImage
                        ? "#FFFFFF"
                        : theme.colors.onSurface,
                      textDecorationLine: isCompleted
                        ? "line-through"
                        : "none",
                    },
                  ]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                {item.description ? (
                  <Text
                    style={[
                      styles.description,
                      {
                        color: hasImage
                          ? "rgba(255,255,255,0.75)"
                          : theme.colors.onSurfaceVariant,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {item.description}
                  </Text>
                ) : null}
              </View>

              <SquircleView
                style={[
                  styles.categoryBadge,
                  {
                    backgroundColor: hasImage
                      ? "rgba(255,255,255,0.2)"
                      : theme.colors.surfaceVariant,
                    borderColor: hasImage
                      ? "rgba(255,255,255,0.3)"
                      : theme.colors.outlineVariant,
                    borderWidth: 1,
                  },
                ]}
                cornerSmoothing={1}
              >
                <Ionicons
                  name={categoryIcon}
                  size={16}
                  color={
                    hasImage
                      ? "rgba(255,255,255,0.9)"
                      : theme.colors.onSurfaceVariant
                  }
                />
              </SquircleView>
            </View>
          </SquircleView>
        </Pressable>
      </Animated.View>
    );
  }
);

BucketListCard.displayName = "BucketListCard";

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    overflow: "hidden",
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  textBlock: {
    flex: 1,
    marginLeft: 14,
    marginRight: 12,
  },
  title: {
    fontFamily: "Archivo-Bold",
    fontSize: 15,
  },
  description: {
    fontFamily: "Archivo-Medium",
    fontSize: 12,
    marginTop: 2,
    letterSpacing: 0.1,
  },
  categoryBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});
