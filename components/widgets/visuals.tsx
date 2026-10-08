/**
 * Aspecto de los widgets
 * Color de cada widget e icono translúcido de fondo, compartidos por el inicio del grupo y el catálogo.
 */

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { useTheme } from "react-native-paper";

export type WidgetTone =
  "coral" | "green" | "blue" | "amber" | "purple" | "pink";

interface ToneColors {
  /** Fondo de la ficha del icono y de las barras. */
  chip: string;
  /** Icono sobre la ficha. */
  icon: string;
  /** Texto en color, legible sobre el fondo de la tarjeta. */
  text: string;
  /** Barras y otros rellenos destacados. */
  accent: string;
}

export interface TonePalette extends ToneColors {
  /** Texto principal: el neutro del tema. */
  strong: string;
  /** Texto de apoyo: el neutro del tema. */
  soft: string;
}

// Cada widget tiene su color, pero solo como acento: el icono y un detalle por tarjeta.
// El fondo y los textos son los neutros del resto de la app.
const WIDGET_TONES: Record<
  WidgetTone,
  { light: ToneColors; dark: ToneColors }
> = {
  coral: {
    light: {
      chip: "#F5C4B3",
      icon: "#4A1B0C",
      text: "#993C1D",
      accent: "#D85A30",
    },
    dark: {
      chip: "#712B13",
      icon: "#F5C4B3",
      text: "#F0997B",
      accent: "#D85A30",
    },
  },
  green: {
    light: {
      chip: "#9FE1CB",
      icon: "#04342C",
      text: "#0F6E56",
      accent: "#1D9E75",
    },
    dark: {
      chip: "#085041",
      icon: "#9FE1CB",
      text: "#5DCAA5",
      accent: "#1D9E75",
    },
  },
  blue: {
    light: {
      chip: "#B5D4F4",
      icon: "#042C53",
      text: "#185FA5",
      accent: "#378ADD",
    },
    dark: {
      chip: "#0C447C",
      icon: "#B5D4F4",
      text: "#85B7EB",
      accent: "#378ADD",
    },
  },
  amber: {
    light: {
      chip: "#FAC775",
      icon: "#412402",
      text: "#854F0B",
      accent: "#BA7517",
    },
    dark: {
      chip: "#633806",
      icon: "#FAC775",
      text: "#EF9F27",
      accent: "#EF9F27",
    },
  },
  purple: {
    light: {
      chip: "#CECBF6",
      icon: "#26215C",
      text: "#534AB7",
      accent: "#7F77DD",
    },
    dark: {
      chip: "#3C3489",
      icon: "#CECBF6",
      text: "#AFA9EC",
      accent: "#7F77DD",
    },
  },
  pink: {
    light: {
      chip: "#F4C0D1",
      icon: "#4B1528",
      text: "#993556",
      accent: "#D4537E",
    },
    dark: {
      chip: "#72243E",
      icon: "#F4C0D1",
      text: "#ED93B1",
      accent: "#D4537E",
    },
  },
};

export function useWidgetTone(tone: WidgetTone): TonePalette {
  const theme = useTheme();

  return {
    ...WIDGET_TONES[tone][theme.dark ? "dark" : "light"],
    strong: theme.colors.onSurface,
    soft: theme.colors.onSurfaceVariant,
  };
}

// Tono de cada widget por su nombre; los que no aparecen usan el verde de la marca
const TONE_BY_WIDGET: Record<string, WidgetTone> = {
  Agenda: "coral",
  Gastos: "green",
  Planes: "blue",
  Premios: "amber",
  Flashback: "purple",
  Bloc: "pink",
};

export const getWidgetTone = (name: string): WidgetTone | undefined =>
  TONE_BY_WIDGET[name];

// Como fondo queda mejor el icono relleno que el de línea
const toSolidIcon = (
  icon: keyof typeof Ionicons.glyphMap,
): keyof typeof Ionicons.glyphMap => {
  const solid = icon.replace(/-outline$/, "");
  return solid in Ionicons.glyphMap
    ? (solid as keyof typeof Ionicons.glyphMap)
    : icon;
};

interface WidgetWatermarkProps {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  /** Más visible: algo está pasando ahora en el widget. */
  emphasized?: boolean;
  wide?: boolean;
  /** Tamaño del icono; por defecto, el de las tarjetas del inicio del grupo. */
  size?: number;
  /** Para recolocarlo en tarjetas con otra forma. */
  style?: StyleProp<ViewStyle>;
}

// Icono grande y translúcido en la esquina de la tarjeta, por detrás del contenido
export function WidgetWatermark({
  icon,
  color,
  emphasized = false,
  wide = false,
  size = wide ? 132 : 104,
  style,
}: WidgetWatermarkProps) {
  const theme = useTheme();
  const opacity = emphasized ? 0.34 : theme.dark ? 0.2 : 0.16;

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.widgetWatermark,
        wide && styles.widgetWatermarkWide,
        style,
        { opacity },
      ]}
    >
      <Ionicons name={toSolidIcon(icon)} size={size} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  // Asoma por la esquina superior derecha, recortado por la tarjeta
  widgetWatermark: {
    position: "absolute",
    top: -16,
    right: -20,
    transform: [{ rotate: "-12deg" }],
  },
  widgetWatermarkWide: {
    top: -22,
    right: -16,
  },
});
