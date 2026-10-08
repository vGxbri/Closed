/**
 * Campos agrupados (iOS)
 * Tarjeta de campos de texto al estilo de los formularios de iOS: una fila por campo,
 * con su icono a la izquierda. En iOS 26+ la tarjeta es Liquid Glass.
 */

import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import { SymbolView, SymbolViewProps } from "expo-symbols";
import React, { Children, useImperativeHandle, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  TextInput,
  TextInputProps,
  View,
} from "react-native";
import { useTheme } from "react-native-paper";

const glassAvailable = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

interface GroupedFieldsProps {
  children: React.ReactNode;
}

export function GroupedFields({ children }: GroupedFieldsProps) {
  const theme = useTheme();

  const rows = Children.toArray(children).map((row, index) => (
    <React.Fragment key={index}>
      {index > 0 && (
        <View
          style={[
            styles.separator,
            { backgroundColor: theme.colors.outlineVariant },
          ]}
        />
      )}
      {row}
    </React.Fragment>
  ));

  if (glassAvailable) {
    return (
      <GlassView style={styles.card} glassEffectStyle="regular">
        {rows}
      </GlassView>
    );
  }

  return (
    <View
      style={[
        styles.card,
        styles.cardSolid,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
    >
      {rows}
    </View>
  );
}

interface GroupedFieldProps extends TextInputProps {
  icon: SymbolViewProps["name"];
  /** Campo de contraseña: oculta el texto y añade el botón para mostrarlo. */
  secure?: boolean;
  error?: boolean;
  ref?: React.Ref<TextInput>;
}

export function GroupedField({
  icon,
  secure = false,
  error = false,
  ref,
  style,
  ...inputProps
}: GroupedFieldProps) {
  const theme = useTheme();
  const inputRef = useRef<TextInput>(null);
  const [revealed, setRevealed] = useState(false);

  useImperativeHandle(ref, () => inputRef.current as TextInput, []);

  return (
    // Tocar cualquier punto de la fila, también el icono, enfoca el campo
    <Pressable
      accessible={false}
      onPress={() => inputRef.current?.focus()}
      style={styles.row}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        <SymbolView
          name={icon}
          size={20}
          tintColor={error ? theme.colors.error : theme.colors.onSurfaceVariant}
        />
      </View>

      <TextInput
        ref={inputRef}
        placeholderTextColor={theme.colors.onSurfaceVariant}
        selectionColor={theme.colors.primary}
        secureTextEntry={secure && !revealed}
        style={[styles.input, { color: theme.colors.onSurface }, style]}
        {...inputProps}
      />

      {secure && (
        <Pressable
          onPress={() => setRevealed((value) => !value)}
          accessibilityRole="button"
          accessibilityLabel={
            revealed ? "Ocultar contraseña" : "Mostrar contraseña"
          }
          hitSlop={12}
        >
          <SymbolView
            name={revealed ? "eye.slash" : "eye"}
            size={20}
            tintColor={theme.colors.onSurfaceVariant}
          />
        </Pressable>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "100%",
    borderRadius: 24,
  },
  cardSolid: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    height: 54,
    paddingHorizontal: 18,
  },
  input: {
    flex: 1,
    height: "100%",
    fontFamily: "Archivo-Medium",
    fontSize: 16,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 50,
  },
});
