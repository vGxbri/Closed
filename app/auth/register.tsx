/**
 * Registro de cuenta
 * Formulario para crear una cuenta nueva y acceder a la app.
 */
import { GrainyGradient } from "@/components/premade/organisms/grainy-gradient";
import { CTAButton } from "@/components/ui/CTAButton";
import { GroupedField, GroupedFields } from "@/components/ui/GroupedFields";
import { useSnackbar } from "@/components/ui/SnackbarContext";
import { useAuth } from "@/hooks";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useRef, useState } from "react";
import {
  Platform,
  ScrollView,
  StyleSheet,
  TextInput as NativeTextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";
import SquircleView from "react-native-fast-squircle";
import { HelperText, Text, TextInput, useTheme } from "react-native-paper";
import Animated, {
  FadeInDown,
  FadeInUp,
  useReducedMotion,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const MIN_PASSWORD_LENGTH = 6;

// En iOS los campos van en una tarjeta agrupada
const isIOS = Platform.OS === "ios";

// Amplía la zona táctil de los enlaces de texto hasta el mínimo recomendado
const LINK_HIT_SLOP = { top: 12, bottom: 12, left: 8, right: 8 };

// Los iconos de la izquierda son adorno: el lector de pantalla los salta
const DECORATIVE_ICON = {
  accessible: false,
  accessibilityElementsHidden: true,
  importantForAccessibility: "no-hide-descendants",
} as const;

export default function RegisterScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { signUp } = useAuth();
  const { showSnackbar } = useSnackbar();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const emailRef = useRef<NativeTextInput>(null);
  const passwordRef = useRef<NativeTextInput>(null);
  const confirmPasswordRef = useRef<NativeTextInput>(null);
  const reduceMotion = useReducedMotion();

  const handleRegister = async () => {
    if (!displayName.trim() || !email.trim() || !password || !confirmPassword) {
      showSnackbar("Por favor completa todos los campos", "error");
      return;
    }

    if (password !== confirmPassword) {
      showSnackbar("Las contraseñas no coinciden", "error");
      return;
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      showSnackbar(
        `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
        "error",
      );
      return;
    }

    try {
      setLoading(true);
      await signUp(email.trim(), password, displayName.trim());
      showSnackbar("¡Cuenta creada exitosamente!", "success");
      router.replace("/");
    } catch (err: any) {
      let message = "Error al registrarse";
      const errorMessage = err?.message || "";
      const errorMsg = errorMessage.toLowerCase();

      if (
        errorMsg.includes("user already registered") ||
        errorMsg.includes("already exists") ||
        errorMsg.includes("duplicate")
      ) {
        message = "Este correo ya está registrado. Intenta iniciar sesión.";
      } else if (
        errorMsg.includes("invalid email") ||
        errorMsg.includes("email is invalid")
      ) {
        message = "El formato del correo no es válido";
      } else if (errorMsg.includes("password") && errorMsg.includes("weak")) {
        message = "La contraseña no cumple con los requisitos";
      } else if (errorMsg.includes("network") || errorMsg.includes("fetch")) {
        message = "Error de conexión. Verifica tu internet.";
      } else if (errorMessage) {
        message = errorMessage;
      }

      showSnackbar(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid =
    displayName.trim() &&
    email.trim() &&
    password.length >= MIN_PASSWORD_LENGTH &&
    password === confirmPassword;

  const passwordsDoNotMatch = confirmPassword && password !== confirmPassword;
  const passwordTooShort = password && password.length < MIN_PASSWORD_LENGTH;

  // Lo que comparten los campos de iOS y los de Android
  const nameField = {
    accessibilityLabel: "Nombre de usuario",
    value: displayName,
    onChangeText: setDisplayName,
    autoCapitalize: "words",
    autoComplete: "name",
    textContentType: "name",
    returnKeyType: "next",
    submitBehavior: "submit",
    onSubmitEditing: () => emailRef.current?.focus(),
  } satisfies TextInputProps;

  const emailField = {
    accessibilityLabel: "Correo electrónico",
    value: email,
    onChangeText: setEmail,
    keyboardType: "email-address",
    autoCapitalize: "none",
    autoCorrect: false,
    spellCheck: false,
    autoComplete: "email",
    textContentType: "username",
    returnKeyType: "next",
    submitBehavior: "submit",
    onSubmitEditing: () => passwordRef.current?.focus(),
  } satisfies TextInputProps;

  const passwordField = {
    accessibilityLabel: "Contraseña",
    accessibilityHint: `Mínimo ${MIN_PASSWORD_LENGTH} caracteres`,
    value: password,
    onChangeText: setPassword,
    autoCapitalize: "none",
    autoCorrect: false,
    autoComplete: "new-password",
    textContentType: "newPassword",
    passwordRules: `minlength: ${MIN_PASSWORD_LENGTH};`,
    returnKeyType: "next",
    submitBehavior: "submit",
    onSubmitEditing: () => confirmPasswordRef.current?.focus(),
  } satisfies TextInputProps;

  const confirmPasswordField = {
    accessibilityLabel: "Confirmar contraseña",
    value: confirmPassword,
    onChangeText: setConfirmPassword,
    autoCapitalize: "none",
    autoCorrect: false,
    autoComplete: "new-password",
    textContentType: "newPassword",
    returnKeyType: "go",
    onSubmitEditing: handleRegister,
  } satisfies TextInputProps;

  // En claro, el verde terciario no llega al contraste mínimo sobre el fondo
  const linkColor = theme.dark
    ? theme.colors.tertiary
    : theme.colors.onPrimaryContainer;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Animated.View
        entering={FadeInUp.duration(600)}
        style={styles.backgroundContainer}
      >
        <GrainyGradient
          colors={
            theme.dark
              ? ["#121212", "#1E3A34", "#121212", "#121212"]
              : ["#FAFAFA", "#E0F2EF", "#FAFAFA", "#FAFAFA"]
          }
          intensity={0.08}
          speed={1.5}
          animated={!reduceMotion}
        />
      </Animated.View>

      <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
        <View style={styles.keyboardView}>
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            automaticallyAdjustKeyboardInsets
            showsVerticalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
          >
            <Animated.View
              entering={FadeInUp.duration(600)}
              style={styles.header}
            >
              <SquircleView
                accessibilityElementsHidden
                importantForAccessibility="no-hide-descendants"
                style={[
                  styles.logoContainer,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant,
                    borderWidth: 1,
                  },
                ]}
                cornerSmoothing={1}
              >
                <Image
                  source={
                    theme.dark
                      ? require("../../assets/images/logo_light.png")
                      : require("../../assets/images/logo_dark.png")
                  }
                  style={styles.logo}
                  contentFit="contain"
                />
              </SquircleView>
              <Text
                accessibilityRole="header"
                maxFontSizeMultiplier={1.4}
                style={[styles.title, { color: theme.colors.primary }]}
              >
                Crear Cuenta
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
                Únete a nuestra familia
              </Text>
            </Animated.View>

            <Animated.View
              entering={FadeInDown.duration(600).delay(200)}
              style={styles.form}
            >
              {isIOS ? (
                <>
                  <GroupedFields>
                    <GroupedField
                      icon="person"
                      placeholder="Nombre de usuario"
                      {...nameField}
                    />
                    <GroupedField
                      ref={emailRef}
                      icon="envelope"
                      placeholder="Correo electrónico"
                      {...emailField}
                    />
                    <GroupedField
                      ref={passwordRef}
                      icon="lock"
                      placeholder="Contraseña"
                      secure
                      error={!!passwordTooShort}
                      {...passwordField}
                    />
                    <GroupedField
                      ref={confirmPasswordRef}
                      icon="checkmark.shield"
                      placeholder="Confirmar contraseña"
                      secure
                      error={!!passwordsDoNotMatch}
                      {...confirmPasswordField}
                    />
                  </GroupedFields>

                  {/* Notas bajo la tarjeta, como los pies de sección de iOS */}
                  <View
                    style={styles.fieldNotes}
                    accessibilityLiveRegion="polite"
                  >
                    <Text
                      style={[
                        styles.fieldNote,
                        {
                          color: passwordTooShort
                            ? theme.colors.error
                            : theme.colors.onSurfaceVariant,
                        },
                      ]}
                    >
                      Mínimo {MIN_PASSWORD_LENGTH} caracteres
                    </Text>
                    {!!passwordsDoNotMatch && (
                      <Text
                        style={[
                          styles.fieldNote,
                          { color: theme.colors.error },
                        ]}
                      >
                        Las contraseñas no coinciden
                      </Text>
                    )}
                  </View>
                </>
              ) : (
                <>
                  <TextInput
                    label="Nombre de usuario"
                    placeholder="Tu nombre"
                    {...nameField}
                    mode="outlined"
                    left={
                      <TextInput.Icon
                        icon="account-outline"
                        {...DECORATIVE_ICON}
                      />
                    }
                    style={styles.input}
                    outlineStyle={{
                      borderColor: theme.colors.outlineVariant,
                      borderRadius: 20,
                      borderWidth: 1,
                    }}
                    contentStyle={styles.inputContent}
                  />

                  <TextInput
                    ref={emailRef}
                    label="Correo electrónico"
                    placeholder="tu@email.com"
                    {...emailField}
                    mode="outlined"
                    left={
                      <TextInput.Icon
                        icon="email-outline"
                        {...DECORATIVE_ICON}
                      />
                    }
                    style={styles.input}
                    outlineStyle={{
                      borderColor: theme.colors.outlineVariant,
                      borderRadius: 20,
                      borderWidth: 1,
                    }}
                    contentStyle={styles.inputContent}
                  />

                  <View>
                    <TextInput
                      ref={passwordRef}
                      label="Contraseña"
                      placeholder="••••••••"
                      {...passwordField}
                      secureTextEntry={!showPassword}
                      mode="outlined"
                      left={
                        <TextInput.Icon
                          icon="lock-outline"
                          {...DECORATIVE_ICON}
                        />
                      }
                      right={
                        <TextInput.Icon
                          icon={
                            showPassword ? "eye-off-outline" : "eye-outline"
                          }
                          onPress={() => setShowPassword(!showPassword)}
                          forceTextInputFocus={false}
                          accessibilityLabel={
                            showPassword
                              ? "Ocultar contraseña"
                              : "Mostrar contraseña"
                          }
                        />
                      }
                      error={!!passwordTooShort}
                      style={styles.input}
                      outlineStyle={{
                        borderColor: theme.colors.outlineVariant,
                        borderRadius: 20,
                        borderWidth: 1,
                      }}
                      contentStyle={styles.inputContent}
                    />
                    {/* El requisito se ve siempre, no solo cuando ya hay un error */}
                    <HelperText
                      type={passwordTooShort ? "error" : "info"}
                      visible
                      style={styles.helperText}
                      accessibilityLiveRegion="polite"
                    >
                      Mínimo {MIN_PASSWORD_LENGTH} caracteres
                    </HelperText>
                  </View>

                  <View>
                    <TextInput
                      ref={confirmPasswordRef}
                      label="Confirmar contraseña"
                      placeholder="••••••••"
                      {...confirmPasswordField}
                      secureTextEntry={!showConfirmPassword}
                      mode="outlined"
                      left={
                        <TextInput.Icon
                          icon="lock-check-outline"
                          {...DECORATIVE_ICON}
                        />
                      }
                      right={
                        <TextInput.Icon
                          icon={
                            showConfirmPassword
                              ? "eye-off-outline"
                              : "eye-outline"
                          }
                          onPress={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          forceTextInputFocus={false}
                          accessibilityLabel={
                            showConfirmPassword
                              ? "Ocultar contraseña"
                              : "Mostrar contraseña"
                          }
                        />
                      }
                      error={!!passwordsDoNotMatch}
                      style={styles.input}
                      outlineStyle={{
                        borderColor: theme.colors.outlineVariant,
                        borderRadius: 20,
                        borderWidth: 1,
                      }}
                      contentStyle={styles.inputContent}
                    />
                    {passwordsDoNotMatch && (
                      <HelperText
                        type="error"
                        visible
                        style={styles.helperText}
                        accessibilityLiveRegion="polite"
                      >
                        Las contraseñas no coinciden
                      </HelperText>
                    )}
                  </View>
                </>
              )}

              <CTAButton
                title="Crear Cuenta"
                loadingText="Creando..."
                onPress={handleRegister}
                disabled={!isFormValid}
                loading={loading}
                style={{ marginTop: 14 }}
              />
            </Animated.View>

            <Animated.View
              entering={FadeInDown.duration(600).delay(400)}
              style={styles.footer}
              renderToHardwareTextureAndroid={true}
            >
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                ¿Ya tienes cuenta?
              </Text>
              <TouchableOpacity
                onPress={() => router.push("/auth/login")}
                accessibilityRole="link"
                hitSlop={LINK_HIT_SLOP}
              >
                <Text style={[styles.loginLink, { color: linkColor }]}>
                  Inicia sesión
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFill,
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  logoContainer: {
    width: 88,
    height: 88,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
    borderRadius: 24,
  },
  logo: {
    width: 50,
    height: 50,
  },
  title: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 42,
    letterSpacing: 1,
    textAlign: "center",
    paddingVertical: 5,
  },
  divider: {
    width: "60%",
    height: 1,
    marginTop: 0,
    marginBottom: 0,
  },
  subtitle: {
    fontSize: 16,
    letterSpacing: 0.5,
    textAlign: "center",
    lineHeight: 22,
  },
  form: {
    width: "100%",
  },
  input: {
    marginBottom: 8,
    backgroundColor: "transparent",
  },
  inputContent: {
    fontFamily: "Archivo-Medium",
  },
  fieldNotes: {
    marginTop: 8,
    paddingHorizontal: 18,
    gap: 2,
  },
  fieldNote: {
    fontFamily: "Archivo-Regular",
    fontSize: 13,
    lineHeight: 18,
  },
  helperText: {
    marginTop: -8,
    marginBottom: 4,
    fontFamily: "Archivo-Medium",
  },
  ctaContainer: {
    marginTop: 14,
    width: "100%",
  },
  ctaCard: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderColor: "rgba(255,255,255,0.3)",
    borderWidth: 1,
  },
  ctaContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  ctaText: {
    fontFamily: "Archivo-Bold",
    fontSize: 18,
    letterSpacing: 0.5,
  },
  ctaIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
  },
  loginLink: {
    fontFamily: "Archivo-Bold",
    fontSize: 15,
  },
});
