/**
 * Paleta de colores de Closed
 */

const PALETTE = {
  glowGreen: "#2A8A70",
  glowGreenLight: "#4CAE8E",
  glowGreenDark: "#1E6B57",

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

  almostBlack: "#121212",

  error: "#D32F2F",
  errorLight: "#EF5350",
  errorContainer: "rgba(255, 59, 48, 0.1)",
  success: "#388E3C",
  warning: "#F57C00",
  info: "#1976D2",
};

export const customColors = {
  primary: PALETTE.glowGreen,
  onPrimary: PALETTE.white,
  primaryContainer: PALETTE.grey100,
  onPrimaryContainer: PALETTE.glowGreenDark,

  secondary: PALETTE.grey600,
  onSecondary: PALETTE.white,
  secondaryContainer: PALETTE.grey200,
  onSecondaryContainer: PALETTE.grey900,

  tertiary: PALETTE.glowGreenLight,
  onTertiary: PALETTE.white,
  tertiaryContainer: "#E0F2EF",
  onTertiaryContainer: PALETTE.glowGreenDark,

  error: PALETTE.error,
  onError: PALETTE.white,
  errorContainer: "#FFEBEE",
  onErrorContainer: "#B71C1C",

  background: PALETTE.grey50,
  onBackground: PALETTE.grey900,

  surface: PALETTE.white,
  onSurface: PALETTE.grey900,

  surfaceVariant: PALETTE.grey100,
  onSurfaceVariant: PALETTE.grey700,

  outline: PALETTE.grey400,
  outlineVariant: PALETTE.grey300,

  elevation: {
    level0: "transparent",
    level1: PALETTE.white,
    level2: PALETTE.grey50,
    level3: PALETTE.grey100,
    level4: PALETTE.grey200,
    level5: PALETTE.grey300,
  },
};

export const customColorsDark = {
  primary: PALETTE.glowGreen,
  onPrimary: PALETTE.white,
  primaryContainer: PALETTE.glowGreenDark,
  onPrimaryContainer: "#B2E0D4",

  secondary: PALETTE.grey400,
  onSecondary: PALETTE.grey900,
  secondaryContainer: PALETTE.grey800,
  onSecondaryContainer: PALETTE.grey200,

  tertiary: PALETTE.glowGreenLight,
  onTertiary: PALETTE.grey900,
  tertiaryContainer: "#1E3A34",
  onTertiaryContainer: "#B2E0D4",

  error: PALETTE.errorLight,
  onError: PALETTE.grey900,
  errorContainer: "#4E1B1B",
  onErrorContainer: "#FFCDD2",

  background: PALETTE.almostBlack,
  onBackground: PALETTE.grey200,

  surface: PALETTE.grey900,
  onSurface: PALETTE.grey100,

  surfaceVariant: PALETTE.grey800,
  onSurfaceVariant: PALETTE.grey400,

  outline: PALETTE.grey600,
  outlineVariant: PALETTE.grey700,

  elevation: {
    level0: "transparent",
    level1: PALETTE.grey900,
    level2: "#2C2C2C",
    level3: "#383838",
    level4: "#444444",
    level5: "#505050",
  },
};

export const Colors = {
  primary: customColors.primary,
  primaryLight: customColors.primaryContainer,
  primaryDark: customColors.onPrimaryContainer,

  background: customColors.background,
  backgroundLight: customColors.surface,
  backgroundDark: customColors.surfaceVariant,

  surface: customColors.surface,
  surfaceElevated: customColors.surfaceVariant,

  text: customColors.onBackground,
  textSecondary: customColors.onSurfaceVariant,
  textLight: customColors.outline,
  textOnPrimary: customColors.onPrimary,

  success: "#4CAF50",
  successLight: "rgba(76, 175, 80, 0.15)",
  warning: "#FF9800",
  error: customColors.error,
  errorLight: customColors.errorContainer,
  info: "#2196F3",

  border: customColors.outline,
  shadow: customColors.outlineVariant,
  overlay: "rgba(0, 40, 31, 0.6)",

  gold: "#FFD700",
  silver: "#C0C0C0",
  bronze: "#CD7F32",

  onSurface: customColors.onSurface,
  onSurfaceVariant: customColors.onSurfaceVariant,
  outline: customColors.outline,
  surfaceVariant: customColors.surfaceVariant,
};

export type ColorName = keyof typeof Colors;
