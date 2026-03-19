import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
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

  return (
    <Pressable
      onPress={onPress}
      disabled={!isInteractable}
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
