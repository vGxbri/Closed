/**
 * Entrada manual de código de invitación
 * Permite escribir o pegar un código para unirse a un grupo privado.
 */
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Text, useTheme } from "react-native-paper";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { CircleButton } from "@/components/ui/CircleButton";
import { CTAButton } from "@/components/ui/CTAButton";
import {
  KEYBOARD_DISMISS_RIGHT,
  KEYBOARD_DISMISS_SIZE,
} from "@/components/ui/KeyboardDismissButton";
import { useSnackbar } from "@/components/ui/SnackbarContext";
import { StepTitle } from "@/components/ui/StepTitle";
import { useKeyboardHeight } from "@/hooks/useKeyboardHeight";

const CODE_LENGTH = 6;
// El código se muestra partido en dos mitades para leerlo mejor
const HALF = CODE_LENGTH / 2;

// Saca el código de un texto pegado: admite el código suelto, el enlace o el mensaje de invitación entero
function extractInviteCode(text: string): string | null {
  const fromLink = text.match(/\/join\/([A-Za-z0-9]{6})(?![A-Za-z0-9])/);
  if (fromLink) return fromLink[1].toUpperCase();

  const fromMessage = text.match(
    /c[oó]digo:\s*([A-Za-z0-9]{6})(?![A-Za-z0-9])/i,
  );
  if (fromMessage) return fromMessage[1].toUpperCase();

  const cleaned = text.replace(/[^a-zA-Z0-9]/g, "");
  return cleaned.length === CODE_LENGTH ? cleaned.toUpperCase() : null;
}

export default function JoinGroupInputScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { showSnackbar } = useSnackbar();

  const [code, setCode] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const isComplete = code.length === CODE_LENGTH;

  const handleContinue = () => {
    if (!isComplete) return;
    Keyboard.dismiss();
    router.push(`/join/${code}`);
  };

  const handlePaste = async () => {
    const pasted = extractInviteCode(await Clipboard.getStringAsync());

    if (pasted) {
      setCode(pasted);
    } else {
      showSnackbar("No hay ningún código de invitación copiado", "info");
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <View style={styles.topBar}>
          <CircleButton
            icon="chevron-back"
            label="Atrás"
            onPress={() => router.back()}
          />
        </View>

        {/* El margen inferior se aplica aquí y no en SafeAreaView: el botón lo descuenta
            al subir con el teclado y los dos valores deben coincidir */}
        <KeyboardAvoidingView
          behavior="padding"
          keyboardVerticalOffset={20}
          enabled={Platform.OS === "android"}
          style={[styles.body, { marginBottom: insets.bottom }]}
        >
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            <StepTitle
              main="Únete a un"
              accent="grupo"
              subtitle={`Escribe o pega el código de ${CODE_LENGTH} caracteres que te ha pasado alguien del grupo.`}
            />

            <View style={styles.codeRow}>
              {Array.from({ length: CODE_LENGTH }).map((_, index) => {
                const isActive =
                  focused &&
                  (index === code.length ||
                    (isComplete && index === CODE_LENGTH - 1));

                return (
                  <SquircleView
                    key={index}
                    style={[
                      styles.codeBox,
                      index === HALF - 1 && styles.codeBoxBeforeGap,
                      {
                        backgroundColor: theme.colors.surface,
                        borderColor: isActive
                          ? theme.colors.primary
                          : theme.colors.outlineVariant,
                        borderWidth: isActive ? 2 : StyleSheet.hairlineWidth,
                      },
                    ]}
                    cornerSmoothing={1}
                  >
                    <Text
                      maxFontSizeMultiplier={1.2}
                      style={[
                        styles.codeChar,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      {code[index] ?? ""}
                    </Text>
                  </SquircleView>
                );
              })}

              {/* El campo real va encima con el texto transparente: así recibe los toques,
                  el menú de pegar y el foco del lector de pantalla, y las casillas solo pintan */}
              <TextInput
                ref={inputRef}
                value={code}
                onChangeText={(text) =>
                  setCode(
                    text
                      .replace(/[^a-zA-Z0-9]/g, "")
                      .toUpperCase()
                      .slice(0, CODE_LENGTH),
                  )
                }
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                accessibilityLabel="Código de invitación"
                accessibilityHint={`${CODE_LENGTH} caracteres`}
                style={styles.codeInput}
                selectionColor="transparent"
                caretHidden
                autoFocus
                keyboardType="ascii-capable"
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect={false}
                spellCheck={false}
                maxLength={CODE_LENGTH}
                returnKeyType="go"
                onSubmitEditing={handleContinue}
              />
            </View>

            <Pressable
              onPress={handlePaste}
              accessibilityRole="button"
              hitSlop={8}
              style={({ pressed }) => [
                styles.pasteButton,
                { opacity: pressed ? 0.6 : 1 },
              ]}
            >
              <Ionicons
                name="clipboard-outline"
                size={18}
                color={theme.colors.onSurfaceVariant}
              />
              <Text
                style={[
                  styles.pasteText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Pegar código
              </Text>
            </Pressable>
          </ScrollView>

          {/* El botón se queda pegado encima del teclado; lo de arriba se desplaza si no cabe */}
          <View
            style={[
              styles.footer,
              {
                paddingBottom: 12 + Math.max(0, keyboardHeight - insets.bottom),
              },
              // Con el teclado abierto, hueco a la derecha para el botón de ocultarlo
              keyboardHeight > 0 && {
                paddingRight:
                  KEYBOARD_DISMISS_RIGHT + KEYBOARD_DISMISS_SIZE + 10,
              },
            ]}
          >
            <CTAButton
              title="Buscar grupo"
              onPress={handleContinue}
              disabled={!isComplete}
              backgroundColor={
                isComplete ? theme.colors.primary : theme.colors.surfaceVariant
              }
              textColor={
                isComplete
                  ? theme.colors.onPrimary
                  : theme.colors.onSurfaceVariant
              }
              iconBorderColor={
                isComplete ? "rgba(255,255,255,0.3)" : theme.colors.outline
              }
            />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  body: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  codeRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 24,
    marginTop: 18,
  },
  codeBox: {
    flex: 1,
    aspectRatio: 0.8,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  codeBoxBeforeGap: {
    marginRight: 10,
  },
  codeChar: {
    fontFamily: "Archivo-Bold",
    fontSize: 28,
  },
  codeInput: {
    ...StyleSheet.absoluteFill,
    color: "transparent",
  },
  pasteButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 8,
    marginTop: 22,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  pasteText: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 15,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
});
