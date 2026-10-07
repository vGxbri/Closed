/**
 * Botón para ocultar el teclado
 * Botón flotante que aparece sobre la esquina derecha del teclado en toda la app.
 * Solo iOS: en Android el propio sistema ya ofrece cómo ocultarlo.
 */

import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import { useSegments } from "expo-router";
import { SymbolView } from "expo-symbols";
import React, { useEffect, useState } from "react";
import {
  Animated,
  Dimensions,
  Easing,
  Keyboard,
  KeyboardEvent,
  Platform,
  Pressable,
  StyleSheet,
} from "react-native";
import { useTheme } from "react-native-paper";
import { FullWindowOverlay } from "react-native-screens";

// Medidas públicas: las pantallas que anclan algo sobre el teclado las usan para dejarle hueco
export const KEYBOARD_DISMISS_SIZE = 44;
export const KEYBOARD_DISMISS_RIGHT = 16;
export const KEYBOARD_DISMISS_GAP = 16;

// Desplazamiento inicial: el botón empieza escondido detrás del teclado y sube hasta su sitio
const HIDDEN_OFFSET = KEYBOARD_DISMISS_SIZE + KEYBOARD_DISMISS_GAP + 8;

const glassAvailable = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

export function KeyboardDismissButton() {
  const theme = useTheme();
  const segments = useSegments() as string[];
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [translateY] = useState(() => new Animated.Value(HIDDEN_OFFSET));

  useEffect(() => {
    if (Platform.OS !== "ios") return;

    // Se muestra cuando el teclado ya ha terminado de subir y se oculta en cuanto empieza a bajar
    const onFrame = (event: KeyboardEvent) =>
      setKeyboardHeight(
        Math.max(
          0,
          Dimensions.get("window").height - event.endCoordinates.screenY,
        ),
      );

    const subscriptions = [
      Keyboard.addListener("keyboardDidShow", onFrame),
      Keyboard.addListener("keyboardDidChangeFrame", onFrame),
      Keyboard.addListener("keyboardWillHide", () => setKeyboardHeight(0)),
    ];

    return () => subscriptions.forEach((subscription) => subscription.remove());
  }, []);

  // En el chat el botón de enviar ocupa ese sitio y el teclado ya se oculta arrastrando
  const inChat = segments[segments.length - 1] === "messages";
  const visible = Platform.OS === "ios" && keyboardHeight > 0 && !inChat;

  useEffect(() => {
    if (!visible) return;

    translateY.setValue(HIDDEN_OFFSET);
    Animated.timing(translateY, {
      toValue: 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, translateY]);

  if (!visible) return null;

  const icon = (
    <SymbolView
      name="keyboard.chevron.compact.down"
      size={22}
      tintColor={theme.colors.onSurface}
    />
  );

  // Va en una capa por encima de toda la ventana para verse también sobre los modales nativos.
  // El teclado queda por delante de esa capa, así que el botón parece salir de dentro de él.
  return (
    <FullWindowOverlay>
      <Animated.View
        style={[
          styles.anchor,
          {
            bottom: keyboardHeight + KEYBOARD_DISMISS_GAP,
            transform: [{ translateY }],
          },
        ]}
      >
        {glassAvailable ? (
          <GlassView style={styles.button} isInteractive>
            <Pressable
              onPress={Keyboard.dismiss}
              accessibilityRole="button"
              accessibilityLabel="Ocultar teclado"
              hitSlop={6}
              style={styles.pressable}
            >
              {icon}
            </Pressable>
          </GlassView>
        ) : (
          <Pressable
            onPress={Keyboard.dismiss}
            accessibilityRole="button"
            accessibilityLabel="Ocultar teclado"
            hitSlop={6}
            style={[
              styles.button,
              styles.buttonSolid,
              styles.pressable,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
              },
            ]}
          >
            {icon}
          </Pressable>
        )}
      </Animated.View>
    </FullWindowOverlay>
  );
}

const styles = StyleSheet.create({
  anchor: {
    position: "absolute",
    right: KEYBOARD_DISMISS_RIGHT,
    width: KEYBOARD_DISMISS_SIZE,
    height: KEYBOARD_DISMISS_SIZE,
  },
  button: {
    width: KEYBOARD_DISMISS_SIZE,
    height: KEYBOARD_DISMISS_SIZE,
    borderRadius: KEYBOARD_DISMISS_SIZE / 2,
  },
  buttonSolid: {
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  pressable: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
