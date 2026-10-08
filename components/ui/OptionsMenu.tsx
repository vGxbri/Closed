/**
 * Menú de opciones
 * Bottom sheet con acciones contextuales e iconos por item.
 */

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
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

  // Relleno neutro que funciona tanto sobre la hoja opaca como sobre la de cristal
  const neutralFill = theme.dark
    ? "rgba(255,255,255,0.08)"
    : "rgba(0,0,0,0.05)";

  return (
    <BottomSheetModal
      visible={visible}
      onDismiss={onDismiss}
      blurTarget={blurTarget}
      contentStyle={styles.sheetContent}
    >
      <Text
        accessibilityRole="header"
        style={[styles.title, { color: theme.colors.onSurface }]}
      >
        {title}
      </Text>

      {/* Las opciones van agrupadas en un bloque con separadores, como las listas de iOS */}
      <View style={[styles.group, { backgroundColor: neutralFill }]}>
        {options.map((option, index) => {
          const color = option.isDestructive
            ? theme.colors.error
            : theme.colors.onSurface;

          return (
            <React.Fragment key={`${option.label}-${index}`}>
              {index > 0 && (
                <View
                  style={[
                    styles.separator,
                    { backgroundColor: theme.colors.outlineVariant },
                    !option.icon && styles.separatorNoIcon,
                  ]}
                />
              )}
              <Pressable
                onPress={() => handleOptionPress(option)}
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.optionRow,
                  { opacity: pressed ? 0.55 : 1 },
                ]}
              >
                {option.icon && (
                  <Ionicons name={option.icon} size={21} color={color} />
                )}
                <Text style={[styles.optionLabel, { color }]} numberOfLines={1}>
                  {option.label}
                </Text>
              </Pressable>
            </React.Fragment>
          );
        })}
      </View>

      <Pressable
        onPress={onDismiss}
        accessibilityRole="button"
        style={({ pressed }) => [
          styles.cancelButton,
          { backgroundColor: neutralFill, opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Text style={[styles.cancelText, { color: theme.colors.onSurface }]}>
          Cancelar
        </Text>
      </Pressable>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  sheetContent: {
    paddingHorizontal: 16,
    paddingBottom: 34,
  },
  title: {
    fontFamily: "Archivo-Bold",
    fontSize: 20,
    lineHeight: 25,
    paddingHorizontal: 6,
    paddingTop: 4,
    marginBottom: 14,
  },
  group: {
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 12,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 56,
    paddingHorizontal: 18,
  },
  optionLabel: {
    flex: 1,
    fontFamily: "Archivo-SemiBold",
    fontSize: 16,
  },
  // El separador nace tras el icono
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 53,
  },
  separatorNoIcon: {
    marginLeft: 18,
  },
  cancelButton: {
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 15,
  },
});
