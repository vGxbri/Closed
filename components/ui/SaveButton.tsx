/**
 * Botón de guardar
 * Cápsula verde para barras superiores que solo se muestra cuando hay cambios: cristal tintado en iOS 26+, sólido en el resto.
 */

import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

const glassAvailable = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

interface SaveButtonProps {
  onPress: () => void;
  saving: boolean;
}

export function SaveButton({ onPress, saving }: SaveButtonProps) {
  const theme = useTheme();

  const content = (
    <Pressable
      onPress={onPress}
      disabled={saving}
      accessibilityRole="button"
      accessibilityLabel="Guardar cambios"
      accessibilityState={{ busy: saving }}
      hitSlop={6}
      style={styles.content}
    >
      {saving ? (
        <ActivityIndicator size="small" color={theme.colors.onPrimary} />
      ) : (
        <Text style={[styles.text, { color: theme.colors.onPrimary }]}>
          Guardar
        </Text>
      )}
    </Pressable>
  );

  if (glassAvailable) {
    return (
      <GlassView
        style={styles.button}
        tintColor={theme.colors.primary}
        isInteractive
      >
        {content}
      </GlassView>
    );
  }

  return (
    <View style={[styles.button, { backgroundColor: theme.colors.primary }]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 44,
    minWidth: 104,
    borderRadius: 22,
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  text: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 15,
  },
});
