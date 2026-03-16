import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  TextInput as RNTextInput,
  StyleSheet,
  View,
} from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Button, Text, useTheme } from "react-native-paper";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { CustomHeader } from "../../components/ui/CustomHeader";

const CODE_LENGTH = 6;

export default function JoinGroupInputScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [code, setCode] = useState("");
  const inputRef = useRef<RNTextInput>(null);

  const handleContinue = () => {
    if (code.trim().length === CODE_LENGTH) {
      router.push(`/join/${code.trim()}`);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["left", "right"]}
    >
      <CustomHeader title="" showBackButton={true} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          <Animated.View
            entering={FadeInUp.duration(400)}
            style={styles.header}
          >
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: theme.colors.secondaryContainer },
              ]}
            >
              <Ionicons
                name="keypad"
                size={32}
                color={theme.colors.onSecondaryContainer}
              />
            </View>
            <Text
              variant="headlineMedium"
              style={[styles.title, { color: theme.colors.onSurface }]}
            >
              Ingresa el código
            </Text>
            <Text
              variant="bodyLarge"
              style={[
                styles.subtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Pídele al administrador los 6 dígitos de invitación.
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(200).delay(200)}
            style={styles.form}
          >
            {/* Contenedor relativo para el truco del Input superpuesto */}
            <View style={styles.codeContainer}>
              {Array(CODE_LENGTH)
                .fill(0)
                .map((_, index) => {
                  const digit = code[index] || "";
                  const isFocused =
                    index === code.length ||
                    (index === CODE_LENGTH - 1 && code.length === CODE_LENGTH);

                  return (
                    // @ts-ignore
                    <SquircleView
                      key={index}
                      pointerEvents="none"
                      style={[
                        styles.codeBox,
                        {
                          backgroundColor: theme.colors.surfaceVariant,
                          borderColor: isFocused
                            ? theme.colors.primary
                            : digit
                              ? theme.colors.outline
                              : "transparent",
                          borderWidth: isFocused || digit ? 2 : 0,
                        },
                      ]}
                      cornerSmoothing={1}
                    >
                      <Text
                        style={[
                          styles.codeDigit,
                          {
                            color: digit
                              ? theme.colors.onSurface
                              : theme.colors.onSurfaceVariant,
                          },
                        ]}
                      >
                        {digit}
                      </Text>
                    </SquircleView>
                  );
                })}

              {/* Input invisible que cubre exactamente todos los cuadrados */}
              <RNTextInput
                ref={inputRef}
                value={code}
                onChangeText={(text: string) => {
                  const cleaned = text
                    .replace(/[^a-zA-Z0-9]/g, "")
                    .toUpperCase();
                  if (cleaned.length <= CODE_LENGTH) {
                    setCode(cleaned);
                  }
                }}
                style={styles.hiddenOverlayInput}
                keyboardType="ascii-capable"
                autoCapitalize="characters"
                autoComplete="off"
                autoCorrect={false}
                autoFocus={true}
                caretHidden={true}
                maxLength={CODE_LENGTH} // Le decimos al teclado cuándo parar
                onSubmitEditing={handleContinue}
                returnKeyType="go"
              />
            </View>

            <Button
              mode="contained"
              onPress={handleContinue}
              disabled={code.length !== CODE_LENGTH}
              style={[
                styles.button,
                {
                  backgroundColor:
                    code.length === CODE_LENGTH
                      ? theme.colors.primary
                      : theme.colors.surfaceVariant,
                },
              ]}
              contentStyle={styles.buttonContent}
              labelStyle={[
                styles.buttonLabel,
                {
                  color:
                    code.length === CODE_LENGTH
                      ? theme.colors.onPrimary
                      : theme.colors.onSurfaceVariant,
                },
              ]}
            >
              Buscar grupo
            </Button>
          </Animated.View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
    width: "100%",
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  title: {
    fontWeight: "800",
    marginBottom: 12,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  form: {
    width: "100%",
    alignItems: "center",
  },
  codeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 400,
    marginBottom: 48,
    position: "relative", // Necesario para que el input absolute funcione respecto a este contenedor
  },
  codeBox: {
    width: "14%",
    aspectRatio: 0.85,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  codeDigit: {
    fontSize: 32,
    fontWeight: "800",
  },
  hiddenOverlayInput: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0, // <-- Ahora que es grande, esto oculta el texto nativo al 100%
  },
  button: {
    borderRadius: 100,
    width: "100%",
  },
  buttonContent: {
    paddingVertical: 10,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
});
