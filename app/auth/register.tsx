import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import SquircleView from "react-native-fast-squircle";
import { HelperText, Text, TextInput, useTheme } from "react-native-paper";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { GrainyGradient } from "../../components/premade/organisms/grainy-gradient";
import { useSnackbar } from "../../components/ui/SnackbarContext";
import { useAuth } from "../../hooks";

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

  const handleRegister = async () => {
    if (!displayName.trim() || !email.trim() || !password || !confirmPassword) {
      showSnackbar("Por favor completa todos los campos", "error");
      return;
    }

    if (password !== confirmPassword) {
      showSnackbar("Las contraseñas no coinciden", "error");
      return;
    }

    if (password.length < 6) {
      showSnackbar("La contraseña debe tener al menos 6 caracteres", "error");
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
    password.length >= 6 &&
    password === confirmPassword;

  const passwordsDoNotMatch = confirmPassword && password !== confirmPassword;
  const passwordTooShort = password && password.length < 6;

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Background decoration */}
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
        />
      </Animated.View>

      <SafeAreaView style={styles.safeArea} edges={["left", "right"]}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
            overScrollMode="never"
          >
            {/* Header Section */}
            <Animated.View
              entering={FadeInUp.duration(600)}
              style={styles.header}
            >
              <SquircleView
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
              <Text style={[styles.title, { color: theme.colors.primary }]}>
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

            {/* Form Section */}
            <Animated.View
              entering={FadeInDown.duration(600).delay(200)}
              style={styles.form}
            >
              <TextInput
                label="Nombre de usuario"
                placeholder="Tu nombre"
                value={displayName}
                onChangeText={setDisplayName}
                mode="outlined"
                left={<TextInput.Icon icon="account-outline" />}
                style={styles.input}
                outlineStyle={{
                  borderColor: theme.colors.outlineVariant,
                  borderRadius: 20,
                  borderWidth: 1,
                }}
                contentStyle={styles.inputContent}
              />

              <TextInput
                label="Correo electrónico"
                placeholder="tu@email.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                mode="outlined"
                left={<TextInput.Icon icon="email-outline" />}
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
                  label="Contraseña"
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  mode="outlined"
                  left={<TextInput.Icon icon="lock-outline" />}
                  right={
                    <TextInput.Icon
                      icon={showPassword ? "eye-off-outline" : "eye-outline"}
                      onPress={() => setShowPassword(!showPassword)}
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
                {passwordTooShort && (
                  <HelperText type="error" visible style={styles.helperText}>
                    Mínimo 6 caracteres
                  </HelperText>
                )}
              </View>

              <View>
                <TextInput
                  label="Confirmar contraseña"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={!showConfirmPassword}
                  mode="outlined"
                  left={<TextInput.Icon icon="lock-check-outline" />}
                  right={
                    <TextInput.Icon
                      icon={
                        showConfirmPassword ? "eye-off-outline" : "eye-outline"
                      }
                      onPress={() =>
                        setShowConfirmPassword(!showConfirmPassword)
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
                  <HelperText type="error" visible style={styles.helperText}>
                    Las contraseñas no coinciden
                  </HelperText>
                )}
              </View>

              {/* Register CTA Button */}
              <Pressable
                onPress={handleRegister}
                disabled={!isFormValid || loading}
                style={({ pressed }) => [
                  styles.ctaContainer,
                  {
                    opacity: !isFormValid || loading ? 0.6 : pressed ? 0.9 : 1,
                    transform: [
                      { scale: pressed && isFormValid && !loading ? 0.98 : 1 },
                    ],
                  },
                ]}
              >
                <SquircleView
                  style={[
                    styles.ctaCard,
                    {
                      backgroundColor: theme.colors.primary,
                    },
                  ]}
                  cornerSmoothing={1}
                >
                  <View style={styles.ctaContent}>
                    <Text
                      style={[
                        styles.ctaText,
                        { color: theme.colors.onPrimary },
                      ]}
                    >
                      {loading ? "Creando..." : "Crear Cuenta"}
                    </Text>
                    <SquircleView
                      style={[
                        styles.ctaIcon,
                        {
                          backgroundColor: "rgba(255,255,255,0.15)",
                          borderColor: "rgba(255,255,255,0.3)",
                          borderWidth: 1,
                        },
                      ]}
                      cornerSmoothing={1}
                    >
                      <Ionicons
                        name="arrow-forward"
                        size={20}
                        color={theme.colors.onPrimary}
                      />
                    </SquircleView>
                  </View>
                </SquircleView>
              </Pressable>
            </Animated.View>

            {/* Footer Section */}
            <Animated.View
              entering={FadeInDown.duration(600).delay(400)}
              style={styles.footer}
              renderToHardwareTextureAndroid={true}
            >
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                ¿Ya tienes cuenta?
              </Text>
              <TouchableOpacity onPress={() => router.push("/auth/login")}>
                <Text
                  style={[
                    styles.loginLink,
                    {
                      color: theme.colors.tertiary,
                    },
                  ]}
                >
                  Inicia sesión
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
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
