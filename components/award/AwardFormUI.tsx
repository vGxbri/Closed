import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Text, useTheme } from "react-native-paper";

import {
  awardIconOptions,
  getIconComponent,
  IconName,
} from "../../constants/icons";

// ─── Section Label ──────────────────────────────────────────────────────
export const SectionLabel: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const theme = useTheme();
  return (
    <Text
      style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}
    >
      {children}
    </Text>
  );
};

// ─── Text Input (Squircle) ──────────────────────────────────────────────
interface AwardTextInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  maxLength?: number;
  multiline?: boolean;
  autoFocus?: boolean;
}

export const AwardTextInput: React.FC<AwardTextInputProps> = ({
  value,
  onChangeText,
  placeholder,
  maxLength,
  multiline,
  autoFocus,
}) => {
  const theme = useTheme();
  return (
    <SquircleView
      style={[
        styles.inputContainer,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
          borderWidth: 1,
        },
      ]}
      cornerSmoothing={1}
    >
      <TextInput
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          { color: theme.colors.onSurface },
        ]}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.onSurfaceVariant}
        value={value}
        onChangeText={onChangeText}
        maxLength={maxLength}
        multiline={multiline}
        autoFocus={autoFocus}
      />
    </SquircleView>
  );
};

// ─── Icon Grid ──────────────────────────────────────────────────────────
interface IconGridProps {
  selectedIcon: IconName;
  onSelect: (icon: IconName) => void;
}

export const IconGrid: React.FC<IconGridProps> = ({
  selectedIcon,
  onSelect,
}) => {
  const theme = useTheme();
  return (
    <View style={styles.iconGrid}>
      {awardIconOptions.map((iconName) => {
        const isActive = selectedIcon === iconName;
        return (
          <Pressable
            key={iconName}
            onPress={() => onSelect(iconName)}
            style={({ pressed }) => [
              {
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.96 : 1 }],
              },
            ]}
          >
            <SquircleView
              style={[
                styles.iconBox,
                {
                  backgroundColor: isActive
                    ? theme.colors.primary
                    : theme.colors.surface,
                  borderColor: isActive
                    ? theme.colors.primary
                    : theme.colors.outlineVariant,
                  borderWidth: 1,
                },
              ]}
              cornerSmoothing={1}
            >
              {getIconComponent(
                iconName,
                22,
                isActive
                  ? theme.colors.onPrimary
                  : theme.colors.onSurfaceVariant
              )}
            </SquircleView>
          </Pressable>
        );
      })}
    </View>
  );
};

// ─── Option Row (radio / toggle) ────────────────────────────────────────
interface OptionRowProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle?: string;
  isActive: boolean;
  onPress: () => void;
  variant?: "radio" | "toggle";
  isFirst?: boolean;
  isLast?: boolean;
}

export const OptionRow: React.FC<OptionRowProps> = ({
  icon,
  title,
  subtitle,
  isActive,
  onPress,
  variant = "toggle",
  isFirst,
  isLast,
}) => {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionRow,
        {
          backgroundColor: pressed
            ? theme.dark
              ? "rgba(255,255,255,0.04)"
              : "rgba(0,0,0,0.03)"
            : "transparent",
          borderTopLeftRadius: isFirst ? 16 : 0,
          borderTopRightRadius: isFirst ? 16 : 0,
          borderBottomLeftRadius: isLast ? 16 : 0,
          borderBottomRightRadius: isLast ? 16 : 0,
        },
      ]}
    >
      <SquircleView
        style={[
          styles.optionIconBox,
          {
            backgroundColor: isActive
              ? theme.colors.primary
              : theme.colors.surfaceVariant,
            borderColor: isActive
              ? theme.colors.primary
              : theme.colors.outlineVariant,
            borderWidth: 1,
          },
        ]}
        cornerSmoothing={1}
      >
        <Ionicons
          name={icon}
          size={17}
          color={
            isActive ? theme.colors.onPrimary : theme.colors.onSurfaceVariant
          }
        />
      </SquircleView>

      <View style={styles.optionTextBlock}>
        <Text
          style={[
            styles.optionTitle,
            { color: theme.colors.onSurface },
          ]}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[
              styles.optionSubtitle,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>

      {variant === "radio" ? (
        <View
          style={[
            styles.radio,
            {
              borderColor: isActive
                ? theme.colors.primary
                : theme.colors.outlineVariant,
              backgroundColor: isActive
                ? theme.colors.primary
                : "transparent",
            },
          ]}
        >
          {isActive && (
            <View
              style={[
                styles.radioDot,
                { backgroundColor: theme.colors.onPrimary },
              ]}
            />
          )}
        </View>
      ) : (
        <SquircleView
          style={[
            styles.checkbox,
            {
              backgroundColor: isActive
                ? theme.colors.primary
                : "transparent",
              borderColor: isActive
                ? theme.colors.primary
                : theme.colors.outlineVariant,
              borderWidth: isActive ? 0 : 1.5,
            },
          ]}
          cornerSmoothing={1}
        >
          {isActive && (
            <Ionicons name="checkmark" size={14} color={theme.colors.onPrimary} />
          )}
        </SquircleView>
      )}
    </Pressable>
  );
};

// ─── Grouped Card (rows with dividers) ──────────────────────────────────
interface GroupedCardProps {
  children: React.ReactNode;
}

export const GroupedCard: React.FC<GroupedCardProps> = ({ children }) => {
  const theme = useTheme();
  return (
    <SquircleView
      style={[
        styles.groupedCard,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
          borderWidth: 1,
        },
      ]}
      cornerSmoothing={1}
    >
      {children}
    </SquircleView>
  );
};

// ─── Row Divider ────────────────────────────────────────────────────────
export const RowDivider: React.FC = () => {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.rowDivider,
        { backgroundColor: theme.colors.outlineVariant },
      ]}
    />
  );
};

// ─── Submit Button (footer CTA) ─────────────────────────────────────────
interface SubmitButtonProps {
  label: string;
  loadingLabel?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export const SubmitButton: React.FC<SubmitButtonProps> = ({
  label,
  loadingLabel,
  icon = "add-circle",
  onPress,
  disabled,
  loading,
}) => {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        {
          opacity: pressed ? 0.9 : isDisabled ? 0.5 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
        },
      ]}
    >
      <SquircleView
        style={[styles.submitButton, { backgroundColor: theme.colors.primary }]}
        cornerSmoothing={1}
      >
        {loading ? (
          <Text style={[styles.submitText, { color: theme.colors.onPrimary }]}>
            {loadingLabel ?? "Guardando..."}
          </Text>
        ) : (
          <>
            <Ionicons name={icon} size={20} color={theme.colors.onPrimary} />
            <Text
              style={[styles.submitText, { color: theme.colors.onPrimary }]}
            >
              {label}
            </Text>
          </>
        )}
      </SquircleView>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  sectionLabel: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 13,
    letterSpacing: 0.3,
    marginBottom: 10,
  },

  inputContainer: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    fontFamily: "Archivo-Medium",
    fontSize: 15,
    padding: 0,
  },
  inputMultiline: {
    minHeight: 72,
    textAlignVertical: "top",
  },

  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  iconBox: {
    width: 54,
    height: 54,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },

  groupedCard: {
    borderRadius: 18,
    overflow: "hidden",
  },

  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  optionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  optionTextBlock: {
    flex: 1,
    gap: 2,
  },
  optionTitle: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 14.5,
    letterSpacing: 0.1,
  },
  optionSubtitle: {
    fontFamily: "Archivo-Medium",
    fontSize: 12,
    letterSpacing: 0.1,
  },

  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  rowDivider: {
    height: 1,
    marginLeft: 64,
  },

  submitButton: {
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  submitText: {
    fontFamily: "Archivo-Bold",
    fontSize: 16,
    letterSpacing: 0.3,
  },
});
