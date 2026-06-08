/**
 * Tarjeta contenedora
 */

import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { Colors } from "../../constants/Colors";
import { theme } from "../../constants/theme";

interface CardProps {
  children: React.ReactNode;
  variant?: "default" | "elevated" | "glass";
  padding?: "none" | "sm" | "md" | "lg";
  style?: ViewStyle;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = "default",
  padding = "md",
  style,
}) => {
  const cardStyles: ViewStyle[] = [
    styles.base,
    styles[variant],
    styles[`padding_${padding}`],
    style as ViewStyle,
  ].filter(Boolean) as ViewStyle[];

  return <View style={cardStyles}>{children}</View>;
};

const styles = StyleSheet.create({
  base: {
    borderRadius: theme.borderRadius.lg,
    overflow: "hidden",
  },

  default: {
    backgroundColor: Colors.surface,
    ...theme.shadows.sm,
  },
  elevated: {
    backgroundColor: Colors.surface,
    ...theme.shadows.md,
  },
  glass: {
    backgroundColor: Colors.surfaceElevated,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    ...theme.shadows.sm,
  },

  padding_none: {
    padding: 0,
  },
  padding_sm: {
    padding: theme.spacing.sm,
  },
  padding_md: {
    padding: theme.spacing.md,
  },
  padding_lg: {
    padding: theme.spacing.lg,
  },
});
