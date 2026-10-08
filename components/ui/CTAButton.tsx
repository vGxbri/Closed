/**
 * Botón CTA
 * Llamada a la acción destacada con icono, título y descripción opcional.
 * En iOS el botón estándar es una cápsula: cristal tintado en iOS 26+, color sólido en el resto.
 */

import { Ionicons } from "@expo/vector-icons";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import React from "react";
import {
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Text, useTheme } from "react-native-paper";

interface CTAButtonProps {
  title: string;
  description?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
  backgroundColor?: string;
  textColor?: string;
  iconBackgroundColor?: string;
  iconBorderColor?: string;
  style?: StyleProp<ViewStyle>;
}

const glassAvailable = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

export const CTAButton: React.FC<CTAButtonProps> = ({
  title,
  description,
  iconName = "arrow-forward",
  onPress,
  disabled = false,
  loading = false,
  loadingText,
  backgroundColor,
  textColor,
  iconBackgroundColor = "rgba(255,255,255,0.15)",
  iconBorderColor = "rgba(255,255,255,0.3)",
  style,
}) => {
  const theme = useTheme();

  const bgColor = backgroundColor || theme.colors.primary;
  const txtColor = textColor || theme.colors.onPrimary;

  const isCardVariant = !!description;
  const isInteractable = !disabled && !loading;

  if (Platform.OS === "ios" && !isCardVariant) {
    const capsuleTextColor = disabled
      ? theme.colors.onSurfaceVariant
      : txtColor;

    const content = (
      <>
        <Text
          style={[styles.titleCapsule, { color: capsuleTextColor }]}
          numberOfLines={1}
        >
          {loading && loadingText ? loadingText : title}
        </Text>
        <Ionicons
          name={loading ? "refresh" : iconName}
          size={18}
          color={capsuleTextColor}
        />
      </>
    );

    return (
      <View style={[styles.container, style]}>
        {glassAvailable ? (
          // Deshabilitado pierde el tinte en vez de la opacidad: una opacidad parcial estropea el cristal
          <GlassView
            style={styles.capsule}
            tintColor={disabled ? undefined : bgColor}
            isInteractive
          >
            <Pressable
              onPress={onPress}
              disabled={!isInteractable}
              accessibilityRole="button"
              accessibilityState={{ disabled: !isInteractable, busy: loading }}
              style={styles.capsuleContent}
            >
              {content}
            </Pressable>
          </GlassView>
        ) : (
          <Pressable
            onPress={onPress}
            disabled={!isInteractable}
            accessibilityRole="button"
            accessibilityState={{ disabled: !isInteractable, busy: loading }}
            style={({ pressed }) => [
              styles.capsule,
              styles.capsuleContent,
              {
                backgroundColor: disabled
                  ? theme.colors.surfaceVariant
                  : bgColor,
                opacity: !isInteractable ? 0.6 : pressed ? 0.9 : 1,
              },
            ]}
          >
            {content}
          </Pressable>
        )}
      </View>
    );
  }

  // Variante con descripción en iOS 26+: tarjeta de cristal, tintada salvo en el estilo secundario
  if (glassAvailable && isCardVariant) {
    const isSecondary = bgColor === theme.colors.surfaceVariant;

    return (
      <View style={[styles.container, style]}>
        <GlassView
          style={styles.glassCard}
          tintColor={isSecondary || disabled ? undefined : bgColor}
          isInteractive
        >
          <Pressable
            onPress={onPress}
            disabled={!isInteractable}
            accessibilityRole="button"
            accessibilityState={{ disabled: !isInteractable, busy: loading }}
            style={styles.glassCardContent}
          >
            <View style={styles.textBlock}>
              <Text style={[styles.titleCard, { color: txtColor }]}>
                {loading && loadingText ? loadingText : title}
              </Text>
              {!loading && (
                <Text style={[styles.description, { color: txtColor }]}>
                  {description}
                </Text>
              )}
            </View>
            <Ionicons
              name={loading ? "refresh" : iconName}
              size={24}
              color={txtColor}
            />
          </Pressable>
        </GlassView>
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={!isInteractable}
      accessibilityRole="button"
      accessibilityState={{ disabled: !isInteractable, busy: loading }}
      style={({ pressed }) => [
        styles.container,
        style,
        {
          opacity: !isInteractable ? 0.6 : pressed ? 0.9 : 1,
          transform: [{ scale: pressed && isInteractable ? 0.98 : 1 }],
        },
      ]}
    >
      <SquircleView
        style={[
          isCardVariant ? styles.cardVariant : styles.standardVariant,
          { backgroundColor: bgColor },
          bgColor === theme.colors.surfaceVariant && {
            borderWidth: 1,
            borderColor: theme.colors.outline,
          },
        ]}
        cornerSmoothing={1}
      >
        <View style={styles.content}>
          <View style={isCardVariant && styles.textBlock}>
            <Text
              style={[
                isCardVariant ? styles.titleCard : styles.titleStandard,
                { color: txtColor },
              ]}
            >
              {loading && loadingText ? loadingText : title}
            </Text>
            {description && !loading && (
              <Text style={[styles.description, { color: txtColor }]}>
                {description}
              </Text>
            )}
          </View>

          <SquircleView
            style={[
              isCardVariant
                ? styles.iconContainerCard
                : styles.iconContainerStandard,
              {
                backgroundColor: iconBackgroundColor,
                borderColor: iconBorderColor,
                borderWidth: 1,
              },
            ]}
            cornerSmoothing={1}
          >
            <Ionicons
              name={loading ? "refresh" : iconName}
              size={isCardVariant ? 24 : 20}
              color={txtColor}
            />
          </SquircleView>
        </View>
      </SquircleView>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  glassCard: {
    borderRadius: 24,
  },
  glassCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 22,
    paddingHorizontal: 24,
  },
  capsule: {
    height: 52,
    borderRadius: 26,
  },
  capsuleContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
  },
  titleCapsule: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 17,
  },
  standardVariant: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  cardVariant: {
    paddingVertical: 24,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  textBlock: {
    flex: 1,
    marginRight: 16,
  },
  titleStandard: {
    fontFamily: "Archivo-Bold",
    fontSize: 18,
    letterSpacing: 0.5,
  },
  titleCard: {
    fontFamily: "Archivo-Bold",
    fontSize: 20,
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    opacity: 0.8,
  },
  iconContainerStandard: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainerCard: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
});
