import { Ionicons } from "@expo/vector-icons";
import React, { useCallback } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Text, useTheme } from "react-native-paper";

import { BucketListCategory } from "../../types/database";

// ─── Category definitions ───────────────────────────────────────────
const CATEGORIES: {
  key: BucketListCategory | null;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { key: null, label: "Todos", icon: "apps-outline" },
  { key: "restaurants", label: "Restaurantes", icon: "restaurant-outline" },
  { key: "travel", label: "Viajes", icon: "airplane-outline" },
  { key: "movies", label: "Pelis/Series", icon: "film-outline" },
  { key: "gifts", label: "Regalos", icon: "gift-outline" },
  { key: "other", label: "Ideas", icon: "bulb-outline" },
];

// ─── Props ──────────────────────────────────────────────────────────
interface CategoryFilterProps {
  activeCategory: BucketListCategory | null;
  onCategoryChange: (category: BucketListCategory | null) => void;
}

// ─── Component ──────────────────────────────────────────────────────
export const CategoryFilter = React.memo<CategoryFilterProps>(
  ({ activeCategory, onCategoryChange }) => {
    const theme = useTheme();

    const handlePress = useCallback(
      (key: BucketListCategory | null) => {
        onCategoryChange(key);
      },
      [onCategoryChange]
    );

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.key;

          return (
            <Pressable
              key={cat.key ?? "all"}
              onPress={() => handlePress(cat.key)}
              style={({ pressed }) => [
                { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}
            >
              <SquircleView
                style={[
                  styles.chip,
                  {
                    backgroundColor: isActive
                      ? theme.colors.primary
                      : theme.colors.surfaceVariant,
                    borderColor: isActive
                      ? theme.colors.primary
                      : theme.colors.outlineVariant,
                    borderWidth: 1,
                  },
                ]}
                cornerSmoothing={1}
              >
                <Ionicons
                  name={cat.icon}
                  size={14}
                  color={
                    isActive
                      ? theme.colors.onPrimary
                      : theme.colors.onSurfaceVariant
                  }
                />
                <Text
                  style={[
                    styles.chipLabel,
                    {
                      color: isActive
                        ? theme.colors.onPrimary
                        : theme.colors.onSurfaceVariant,
                    },
                  ]}
                >
                  {cat.label}
                </Text>
              </SquircleView>
            </Pressable>
          );
        })}
      </ScrollView>
    );
  }
);

CategoryFilter.displayName = "CategoryFilter";

// ─── Styles ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  scrollContent: {
    gap: 8,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 5,
  },
  chipLabel: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
