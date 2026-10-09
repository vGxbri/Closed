/**
 * Barra superior flotante
 * Botón de atrás y acción opcional sobre el contenido, que pasa por debajo y se funde con el fondo.
 */

import React from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { CircleButton } from "./CircleButton";

// Alto de la barra flotante bajo el área segura: margen, botón y aire hasta el contenido
export const TOP_BAR_HEIGHT = 8 + 44 + 16;

interface FloatingTopBarProps {
  onBack: () => void;
  right?: React.ReactNode;
}

// Barra superior flotante: el contenido pasa por debajo y se funde con el fondo al llegar arriba
export function FloatingTopBar({ onBack, right }: FloatingTopBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.topBar} pointerEvents="box-none">
      <View
        style={{ height: insets.top + TOP_BAR_HEIGHT + 20 }}
        pointerEvents="none"
      >
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="groupTopFade" x1="0" y1="0" x2="0" y2="1">
              <Stop
                offset="0"
                stopColor={theme.colors.background}
                stopOpacity="1"
              />
              <Stop
                offset="0.55"
                stopColor={theme.colors.background}
                stopOpacity="0.85"
              />
              <Stop
                offset="1"
                stopColor={theme.colors.background}
                stopOpacity="0"
              />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#groupTopFade)" />
        </Svg>
      </View>

      <View
        style={[styles.topBarRow, { top: insets.top + 8 }]}
        pointerEvents="box-none"
      >
        <CircleButton icon="chevron-back" label="Atrás" onPress={onBack} />
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  topBarRow: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },
});
