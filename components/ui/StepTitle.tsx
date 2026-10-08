/**
 * Título de paso
 * Bloque de título en dos líneas (negrita + cursiva de acento) con divisor y subtítulo opcional.
 */

import React from "react";
import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

interface StepTitleProps {
  main: string;
  accent: string;
  subtitle?: string;
}

export function StepTitle({ main, accent, subtitle }: StepTitleProps) {
  const theme = useTheme();

  return (
    <View style={styles.block}>
      {/* Las dos líneas se leen como un único encabezado */}
      <View
        accessible
        accessibilityRole="header"
        accessibilityLabel={`${main} ${accent}`}
      >
        <Text
          maxFontSizeMultiplier={1.3}
          style={[styles.main, { color: theme.colors.onSurface }]}
        >
          {main}
        </Text>
        <Text
          maxFontSizeMultiplier={1.3}
          style={[styles.accent, { color: theme.colors.primary }]}
        >
          {accent}
        </Text>
      </View>
      <View
        style={[
          styles.divider,
          { borderBottomColor: theme.colors.outlineVariant },
        ]}
      />
      {subtitle && (
        <Text
          style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    marginTop: 12,
    marginBottom: 10,
    paddingHorizontal: 24,
  },
  main: {
    fontFamily: "Archivo-Bold",
    fontSize: 36,
  },
  accent: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 42,
    marginTop: -20,
    letterSpacing: 2,
    paddingVertical: 5,
  },
  divider: {
    borderBottomWidth: 1,
    width: "90%",
    marginTop: 5,
  },
  subtitle: {
    fontFamily: "Archivo-Regular",
    fontSize: 15,
    lineHeight: 21,
    marginTop: 14,
  },
});
