/**
 * Botón redondo
 * Botón de icono para barras superiores: cristal en iOS 26+, superficie opaca en el resto.
 */

import { Ionicons } from "@expo/vector-icons";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";

const glassAvailable = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

interface CircleButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  /** Oculta el botón pero conserva su hueco, para no descolocar lo que tenga al lado. */
  hidden?: boolean;
}

export function CircleButton({
  icon,
  label,
  onPress,
  hidden,
}: CircleButtonProps) {
  const theme = useTheme();

  if (hidden) return <View style={styles.button} />;

  const button = (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={styles.pressable}
    >
      <Ionicons name={icon} size={22} color={theme.colors.onSurface} />
    </Pressable>
  );

  if (glassAvailable) {
    return (
      <GlassView style={styles.button} isInteractive>
        {button}
      </GlassView>
    );
  }

  return (
    <View
      style={[
        styles.button,
        styles.buttonSolid,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
    >
      {button}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  buttonSolid: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  pressable: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
