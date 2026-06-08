/**
 * Menú de opciones
 * Bottom sheet con acciones contextuales e iconos por item.
 */

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { BottomSheetModal } from "./BottomSheetModal";

export interface MenuOption {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  action: () => void;
  isDestructive?: boolean;
}

interface OptionsMenuProps {
  visible: boolean;
  title: string;
  options: MenuOption[];
  onDismiss: () => void;
  blurTarget?: React.RefObject<any>;
}

export const OptionsMenu: React.FC<OptionsMenuProps> = ({
  visible,
  title,
  options,
  onDismiss,
  blurTarget,
}) => {
  const theme = useTheme();

  const handleOptionPress = (option: MenuOption) => {
    onDismiss();
    setTimeout(() => option.action(), 300);
  };

  return (
    <BottomSheetModal
      visible={visible}
      onDismiss={onDismiss}
      blurTarget={blurTarget}
      contentStyle={styles.sheetContent}
    >
      <Text
        variant="titleMedium"
        style={[styles.title, { color: theme.colors.onSurface }]}
      >
        {title}
      </Text>

      <View style={styles.optionsContainer}>
        {options.map((option, index) => (
          <TouchableOpacity
            key={`${option.label}-${index}`}
            style={[
              styles.optionRow,
              {
                backgroundColor: option.isDestructive
                  ? `${theme.colors.error}10`
                  : theme.colors.surfaceVariant + "40",
                borderColor: option.isDestructive
                  ? `${theme.colors.error}30`
                  : theme.colors.outlineVariant,
              },
            ]}
            onPress={() => handleOptionPress(option)}
            activeOpacity={0.7}
          >
            {option.icon && (
              <View
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: option.isDestructive
                      ? `${theme.colors.error}20`
                      : theme.colors.primaryContainer,
                  },
                ]}
              >
                <Ionicons
                  name={option.icon}
                  size={20}
                  color={
                    option.isDestructive
                      ? theme.colors.error
                      : theme.colors.onSurface
                  }
                />
              </View>
            )}
            <Text
              variant="bodyLarge"
              style={[
                styles.optionLabel,
                {
                  color: option.isDestructive
                    ? theme.colors.error
                    : theme.colors.onSurface,
                  marginLeft: option.icon ? 0 : 4,
                },
              ]}
            >
              {option.label}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={18}
              color={
                option.isDestructive
                  ? theme.colors.error
                  : theme.colors.onSurfaceVariant
              }
            />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.cancelButton,
          { borderColor: theme.colors.outlineVariant },
        ]}
        onPress={onDismiss}
        activeOpacity={0.7}
      >
        <Text
          variant="labelLarge"
          style={{
            color: theme.colors.onSurfaceVariant,
            fontWeight: "600",
          }}
        >
          Cancelar
        </Text>
      </TouchableOpacity>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  sheetContent: {
    paddingHorizontal: 20,
    paddingBottom: 34,
  },
  title: {
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "700",
  },
  optionsContainer: {
    gap: 10,
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  optionLabel: {
    flex: 1,
    fontWeight: "600",
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
});
