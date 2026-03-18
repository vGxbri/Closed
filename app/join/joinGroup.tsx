import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput as RNTextInput,
  StyleSheet,
  View,
} from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Text, useTheme } from "react-native-paper";
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
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <SafeAreaView
        style={styles.safeArea}
        edges={["top", "left", "right", "bottom"]}
      >
        <CustomHeader title="" showBackButton={true} />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "padding"}
          style={styles.keyboardView}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <View style={styles.content}>
            <Animated.View
              entering={FadeInUp.duration(400)}
              style={styles.header}
            >
              <SquircleView
                style={[
                  styles.iconContainer,
                  {
                    backgroundColor: theme.colors.secondaryContainer,
                    borderColor: "rgba(255,255,255,0.1)",
                    borderWidth: 1,
                  },
                ]}
                cornerSmoothing={1}
              >
                <Ionicons
                  name="keypad"
                  size={32}
                  color={theme.colors.onSecondaryContainer}
                />
              </SquircleView>

              <Text
                variant="headlineMedium"
                style={[styles.title, { color: theme.colors.primary }]}
              >
                Únete a un grupo
              </Text>

              <View
                style={[
                  styles.divider,
                  { backgroundColor: theme.colors.outlineVariant },
                ]}
              />

              <Text
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
                                ? theme.colors.outlineVariant
                                : "transparent",
                            borderWidth: isFocused || digit ? 1 : 0,
                          },
                        ]}
                        cornerSmoothing={1}
                      >
                        <Text
                          style={[
                            styles.codeDigit,
                            {
                              color: theme.colors.onSurface,
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
                  maxLength={CODE_LENGTH}
                  onSubmitEditing={handleContinue}
                  returnKeyType="go"
                />
              </View>

              {/* CTA Section */}
              <Pressable
                onPress={handleContinue}
                disabled={code.length !== CODE_LENGTH}
                style={({ pressed }) => [
                  {
                    opacity:
                      code.length !== CODE_LENGTH ? 0.6 : pressed ? 0.9 : 1,
                    transform: [
                      {
                        scale: pressed && code.length === CODE_LENGTH ? 0.98 : 1,
                      },
                    ],
                    width: "100%",
                  },
                ]}
              >
                <SquircleView
                  style={[
                    styles.ctaCard,
                    {
                      backgroundColor:
                        code.length === CODE_LENGTH
                          ? theme.colors.primary
                          : theme.colors.surfaceVariant,
                    },
                  ]}
                  cornerSmoothing={1}
                >
                  <View style={styles.ctaContent}>
                    <View style={styles.ctaTextBlock}>
                      <Text
                        style={[
                          styles.ctaTitle,
                          {
                            color:
                              code.length === CODE_LENGTH
                                ? theme.colors.onPrimary
                                : theme.colors.onSurfaceVariant,
                          },
                        ]}
                      >
                        Buscar grupo
                      </Text>
                    </View>
                    <SquircleView
                      style={[
                        styles.ctaIcon,
                        {
                          backgroundColor: "rgba(255,255,255,0.15)",
                          borderColor:
                            code.length === CODE_LENGTH
                              ? "rgba(255,255,255,0.3)"
                              : theme.colors.outline,
                          borderWidth: 1,
                          borderRadius: 16,
                        },
                      ]}
                      cornerSmoothing={1}
                    >
                      <Ionicons
                        name="arrow-forward"
                        size={24}
                        color={
                          code.length === CODE_LENGTH
                            ? theme.colors.onPrimary
                            : theme.colors.onSurfaceVariant
                        }
                      />
                    </SquircleView>
                  </View>
                </SquircleView>
              </Pressable>
            </Animated.View>
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
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 20,
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
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 36,
    letterSpacing: 1,
    textAlign: "center",
    marginBottom: 8,
    paddingVertical: 5,
  },
  divider: {
    width: "85%",
    height: 1,
    marginTop: 4,
    marginBottom: 24,
  },
  subtitle: {
    fontSize: 16,
    letterSpacing: 0.5,
    textAlign: "center",
    lineHeight: 22,
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
    position: "relative",
  },
  codeBox: {
    width: "14.5%",
    aspectRatio: 0.85,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  codeDigit: {
    fontSize: 28,
    fontFamily: "Archivo-Bold",
  },
  hiddenOverlayInput: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0,
  },
  ctaCard: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  ctaContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ctaTextBlock: {
    flex: 1,
    marginRight: 16,
  },
  ctaTitle: {
    fontFamily: "Archivo-Bold",
    fontSize: 20,
    marginBottom: 4,
  },
  ctaDescription: {
    fontSize: 14,
    opacity: 0.8,
  },
  ctaIcon: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
});
