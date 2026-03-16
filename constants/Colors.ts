/**
 * Closed Color Palette
 * Based on Material Design 3
 */

// =====================================================
// DEFINICIONES DE COLORES (Extraídas de _layout.tsx)
// =====================================================

// =====================================================
// CLOSED COLOR PALETTE - Neutral Theme with Green Accents
// =====================================================

// Base Palette
const PALETTE = {
  // Accent Colors (Greens - used sparingly)
  glowGreen: "#2A8A70", // Primary accent
  glowGreenLight: "#4CAE8E", // Lighter accent for hover/pressed
  glowGreenDark: "#1E6B57", // Darker accent

  // Neutral Light
  white: "#FFFFFF",
  grey50: "#FAFAFA",
  grey100: "#F5F5F5",
  grey200: "#EEEEEE",
  grey300: "#E0E0E0",
  grey400: "#BDBDBD",
  grey500: "#9E9E9E",
  grey600: "#757575",
  grey700: "#616161",
  grey800: "#424242",
  grey900: "#212121",

  // Almost Black
  almostBlack: "#121212",

  // Status
  error: "#D32F2F",
  errorLight: "#EF5350",
  success: "#388E3C",
  warning: "#F57C00",
  info: "#1976D2",
};

// =====================================================
// LIGHT MODE
// =====================================================
export const customColors = {
  // Primary (Interactive Elements - Buttons, Active States)
  primary: PALETTE.glowGreen,
  onPrimary: PALETTE.white,
  primaryContainer: PALETTE.grey100, // Neutral container
  onPrimaryContainer: PALETTE.glowGreenDark,

  // Secondary (Neutral)
  secondary: PALETTE.grey600,
  onSecondary: PALETTE.white,
  secondaryContainer: PALETTE.grey200,
  onSecondaryContainer: PALETTE.grey900,

  // Tertiary (Accent touch)
  tertiary: PALETTE.glowGreenLight,
  onTertiary: PALETTE.white,
  tertiaryContainer: "#E0F2EF", // Very light green tint
  onTertiaryContainer: PALETTE.glowGreenDark,

  // Error
  error: PALETTE.error,
  onError: PALETTE.white,
  errorContainer: "#FFEBEE",
  onErrorContainer: "#B71C1C",

  // Backgrounds & Surfaces (Light Mode)
  background: PALETTE.grey50, // Very light grey, not pure white
  onBackground: PALETTE.grey900,

  surface: PALETTE.white,
  onSurface: PALETTE.grey900,

  surfaceVariant: PALETTE.grey100,
  onSurfaceVariant: PALETTE.grey700,

  // Outline (Borders)
  outline: PALETTE.grey400,
  outlineVariant: PALETTE.grey300,

  // MD3 Elevation (Neutral tones)
  elevation: {
    level0: "transparent",
    level1: PALETTE.white,
    level2: PALETTE.grey50,
    level3: PALETTE.grey100,
    level4: PALETTE.grey200,
    level5: PALETTE.grey300,
  },
};

// =====================================================
// DARK MODE
// =====================================================
export const customColorsDark = {
  // Primary (Interactive - Green Accent)
  primary: PALETTE.glowGreen,
  onPrimary: PALETTE.white,
  primaryContainer: PALETTE.glowGreenDark,
  onPrimaryContainer: "#B2E0D4", // Light green text on dark green bg

  // Secondary (Neutral)
  secondary: PALETTE.grey400,
  onSecondary: PALETTE.grey900,
  secondaryContainer: PALETTE.grey800,
  onSecondaryContainer: PALETTE.grey200,

  // Tertiary (Subtle accent)
  tertiary: PALETTE.glowGreenLight,
  onTertiary: PALETTE.grey900,
  tertiaryContainer: "#1E3A34", // Dark green tint
  onTertiaryContainer: "#B2E0D4",

  // Error
  error: PALETTE.errorLight,
  onError: PALETTE.grey900,
  errorContainer: "#4E1B1B",
  onErrorContainer: "#FFCDD2",

  // Backgrounds & Surfaces (Dark Mode)
  background: PALETTE.almostBlack,
  onBackground: PALETTE.grey200,

  surface: PALETTE.grey900, // Slightly lighter than background
  onSurface: PALETTE.grey100,

  surfaceVariant: PALETTE.grey800,
  onSurfaceVariant: PALETTE.grey400,

  // Outline
  outline: PALETTE.grey600,
  outlineVariant: PALETTE.grey700,

  // MD3 Elevation (Dark neutral tones)
  elevation: {
    level0: "transparent",
    level1: PALETTE.grey900,
    level2: "#2C2C2C",
    level3: "#383838",
    level4: "#444444",
    level5: "#505050",
  },
};

// Mapeo para mantener compatibilidad con el objeto Colors anterior
// Usaremos los colores claros por defecto para el objeto estático
export const Colors = {
  // Primary Colors
  primary: customColors.primary,
  primaryLight: customColors.primaryContainer,
  primaryDark: customColors.onPrimaryContainer,

  // Background Colors
  background: customColors.background,
  backgroundLight: customColors.surface,
  backgroundDark: customColors.surfaceVariant,

  // Surface Colors (for cards, modals)
  surface: customColors.surface,
  surfaceElevated: customColors.surfaceVariant,

  // Text Colors
  text: customColors.onBackground,
  textSecondary: customColors.onSurfaceVariant,
  textLight: customColors.outline,
  textOnPrimary: customColors.onPrimary,

  // Status Colors
  success: "#4CAF50",
  successLight: "rgba(76, 175, 80, 0.15)",
  warning: "#FF9800",
  error: customColors.error,
  errorLight: customColors.errorContainer,
  info: "#2196F3",

  // Misc
  border: customColors.outline,
  shadow: customColors.outlineVariant,
  overlay: "rgba(0, 40, 31, 0.6)", // Deep Green overlay

  // Award/Trophy Colors (Mantener originales)
  gold: "#FFD700",
  silver: "#C0C0C0",
  bronze: "#CD7F32",

  // Material Design 3 Tokens (compatibilidad)
  onSurface: customColors.onSurface,
  onSurfaceVariant: customColors.onSurfaceVariant,
  outline: customColors.outline,
  surfaceVariant: customColors.surfaceVariant,
};

export type ColorName = keyof typeof Colors;
