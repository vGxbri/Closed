/**
 * Pantalla de estado
 * Icono, título y mensaje centrados, con acciones opcionales al pie. Para cargas, éxitos y errores a pantalla completa.
 */

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import SquircleView from "react-native-fast-squircle";
import { ActivityIndicator, Text, useTheme } from "react-native-paper";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { CircleButton } from "./CircleButton";

interface StatusViewProps {
  /** Sin icono se muestra un indicador de carga. */
  icon?: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  message: string;
  onClose?: () => void;
  children?: React.ReactNode;
}

export function StatusView({
  icon,
  color,
  title,
  message,
  onClose,
  children,
}: StatusViewProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["top", "left", "right"]}
    >
      <View style={styles.topBar}>
        <CircleButton
          icon="close"
          label="Cerrar"
          onPress={onClose ?? (() => {})}
          hidden={!onClose}
        />
      </View>

      <View style={styles.content} accessibilityLiveRegion="polite">
        <SquircleView
          style={[styles.chip, { backgroundColor: `${color}1F` }]}
          cornerSmoothing={1}
        >
          {icon ? (
            <Ionicons name={icon} size={36} color={color} />
          ) : (
            <ActivityIndicator size="small" color={color} />
          )}
        </SquircleView>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: theme.colors.onSurface }]}
        >
          {title}
        </Text>
        <Text
          style={[styles.message, { color: theme.colors.onSurfaceVariant }]}
        >
          {message}
        </Text>
      </View>

      <View style={[styles.footer, { paddingBottom: 12 + insets.bottom }]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

interface TextLinkProps {
  label: string;
  onPress: () => void;
}

/** Acción secundaria en texto, para acompañar al botón principal. */
export function TextLink({ label, onPress }: TextLinkProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      hitSlop={8}
      style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
    >
      <Text style={[styles.textLink, { color: theme.colors.onSurfaceVariant }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  chip: {
    width: 76,
    height: 76,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
  },
  title: {
    fontFamily: "Archivo-Bold",
    fontSize: 24,
    lineHeight: 30,
    textAlign: "center",
    marginBottom: 8,
  },
  message: {
    fontFamily: "Archivo-Regular",
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
    maxWidth: 300,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 14,
    alignItems: "center",
  },
  textLink: {
    fontFamily: "Archivo-Bold",
    fontSize: 15,
    paddingVertical: 8,
  },
});
