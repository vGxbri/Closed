/**
 * Barra de escritura del chat
 * Campo de mensaje flotante con el botón de enviar dentro y, encima, el mensaje al que se responde o que se edita.
 */

import { Ionicons } from "@expo/vector-icons";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { Text, useTheme } from "react-native-paper";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

// Liquid Glass solo existe en iOS 26+; en el resto la barra es una superficie opaca.
const glassAvailable = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

export interface ComposerContext {
  kind: "reply" | "edit";
  /** A quién se responde; en edición no se usa. */
  name?: string;
  text: string;
}

interface ChatComposerProps {
  ref?: React.Ref<TextInput>;
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  /** Bloquea el envío mientras se guarda una edición. */
  busy?: boolean;
  context?: ComposerContext | null;
  onCancelContext: () => void;
}

export function ChatComposer({
  ref,
  value,
  onChangeText,
  onSend,
  busy = false,
  context,
  onCancelContext,
}: ChatComposerProps) {
  const theme = useTheme();

  const isEdit = context?.kind === "edit";
  const canSend = value.trim().length > 0 && !busy;
  const neutralFill = theme.dark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)";

  const content = (
    <>
      {context && (
        // Dentro del cristal solo se desvanece el contenido, nunca el propio cristal
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(120)}
          style={styles.context}
        >
          <View
            style={[
              styles.contextBar,
              { backgroundColor: theme.colors.primary },
            ]}
          />
          <View style={styles.contextText}>
            <Text
              style={[styles.contextLabel, { color: theme.colors.primary }]}
              numberOfLines={1}
            >
              {isEdit ? "Editando mensaje" : `Respondiendo a ${context.name}`}
            </Text>
            <Text
              style={[
                styles.contextPreview,
                { color: theme.colors.onSurfaceVariant },
              ]}
              numberOfLines={1}
            >
              {context.text}
            </Text>
          </View>
          <Pressable
            onPress={onCancelContext}
            accessibilityRole="button"
            accessibilityLabel={
              isEdit ? "Cancelar la edición" : "Cancelar la respuesta"
            }
            hitSlop={10}
            style={({ pressed }) => [
              styles.contextClose,
              { backgroundColor: neutralFill, opacity: pressed ? 0.5 : 1 },
            ]}
          >
            <Ionicons name="close" size={16} color={theme.colors.onSurface} />
          </Pressable>
        </Animated.View>
      )}

      <View style={styles.row}>
        <TextInput
          ref={ref}
          style={[styles.input, { color: theme.colors.onSurface }]}
          placeholder="Mensaje"
          placeholderTextColor={theme.colors.onSurfaceVariant}
          accessibilityLabel="Mensaje"
          value={value}
          onChangeText={onChangeText}
          selectionColor={theme.colors.primary}
          multiline
          maxLength={2000}
        />

        <Pressable
          onPress={onSend}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel={isEdit ? "Guardar cambios" : "Enviar mensaje"}
          accessibilityState={{ disabled: !canSend, busy }}
          hitSlop={6}
          style={({ pressed }) => [
            styles.send,
            {
              backgroundColor: canSend ? theme.colors.primary : neutralFill,
              transform: [{ scale: pressed ? 0.9 : 1 }],
            },
          ]}
        >
          {busy ? (
            <ActivityIndicator
              size="small"
              color={theme.colors.onSurfaceVariant}
            />
          ) : (
            <Ionicons
              name={isEdit ? "checkmark" : "arrow-up"}
              size={20}
              color={
                canSend ? theme.colors.onPrimary : theme.colors.onSurfaceVariant
              }
            />
          )}
        </Pressable>
      </View>
    </>
  );

  if (glassAvailable) {
    return <GlassView style={styles.container}>{content}</GlassView>;
  }

  return (
    <View
      style={[
        styles.container,
        styles.containerSolid,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
    >
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 25,
    overflow: "hidden",
  },
  containerSolid: {
    borderWidth: StyleSheet.hairlineWidth,
  },

  context: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: 16,
    paddingRight: 10,
    paddingTop: 12,
    paddingBottom: 4,
  },
  contextBar: {
    width: 3,
    alignSelf: "stretch",
    borderRadius: 2,
  },
  contextText: { flex: 1 },
  contextLabel: { fontFamily: "Archivo-SemiBold", fontSize: 13 },
  contextPreview: {
    fontFamily: "Archivo-Regular",
    fontSize: 14,
    lineHeight: 19,
    marginTop: 1,
  },
  contextClose: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },

  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingLeft: 18,
    paddingRight: 7,
    paddingVertical: 7,
  },
  input: {
    flex: 1,
    fontFamily: "Archivo-Regular",
    fontSize: 16,
    lineHeight: 21,
    maxHeight: 126,
    minHeight: 36,
    paddingTop: 8,
    paddingBottom: 7,
    textAlignVertical: "center",
  },
  send: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
});
