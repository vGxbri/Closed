import { Ionicons } from "@expo/vector-icons";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
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
import { Text, TextInput, useTheme } from "react-native-paper";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { GrainyGradient } from "../../components/premade/organisms/grainy-gradient";
import { useSnackbar } from "../../components/ui/SnackbarContext";
import { useAuth } from "../../hooks";
import { supabase } from "../../lib/supabase";

export default function LoginScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { signIn } = useAuth();
  const { showSnackbar } = useSnackbar();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  React.useEffect(() => {
    try {
      GoogleSignin.configure({
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        scopes: ["email", "profile"],
      });
    } catch (e) {
      console.error("GS Configure Error", e);
    }
  }, []);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices();
      const userInfo: any = await GoogleSignin.signIn();

      if (userInfo.type === "cancelled") {
        return;
      }

      const idToken = userInfo.data?.idToken || userInfo.idToken;

      if (idToken) {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: idToken,
        });
        if (error) throw error;
        router.replace("/");
      } else {
        throw new Error("No token found");
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        // cancelled
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        showSnackbar("Google Play Services no disponible", "error");
      } else {
        console.error(error);
        showSnackbar(error.message || "Error Google Login", "error");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      showSnackbar("Por favor ingresa email y contraseña", "error");
      return;
    }

    try {
      setLoading(true);
      await signIn(email.trim(), password);
      router.replace("/");
    } catch (err: any) {
      let friendlyMessage = "Error al iniciar sesión";
      const errorMessage = err?.message || "";
      const errorMsgLower = errorMessage.toLowerCase();

      if (
        errorMsgLower.includes("invalid login credentials") ||
        errorMsgLower.includes("invalid email or password") ||
        errorMsgLower.includes("invalid credentials")
      ) {
        friendlyMessage = "Correo o contraseña incorrectos";
      } else if (errorMsgLower.includes("email not confirmed")) {
        friendlyMessage = "Debes confirmar tu correo antes de iniciar sesión";
      } else if (
        errorMsgLower.includes("user not found") ||
        errorMsgLower.includes("no user with that email")
      ) {
        friendlyMessage = "No existe una cuenta con este correo";
      } else if (
        errorMsgLower.includes("network") ||
        errorMsgLower.includes("fetch")
      ) {
        friendlyMessage = "Error de conexión. Verifica tu internet.";
      } else if (errorMessage) {
        friendlyMessage = errorMessage;
      }

      showSnackbar(friendlyMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = email.trim().length > 0 && password.length > 0;

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
                ¡Hola de nuevo!
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
                Inicia sesión para continuar
              </Text>
            </Animated.View>

            {/* Form Section */}
            <Animated.View
              entering={FadeInDown.duration(600).delay(200)}
              style={styles.form}
            >
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
                style={styles.input}
                outlineStyle={{
                  borderColor: theme.colors.outlineVariant,
                  borderRadius: 20,
                  borderWidth: 1,
                }}
                contentStyle={styles.inputContent}
              />

              {/* Login CTA Button */}
              <Pressable
                onPress={handleLogin}
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
                      {loading ? "Iniciando..." : "Iniciar Sesión"}
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

              {/* Divider "o continúa con" */}
              <View style={styles.socialDivider}>
                <View
                  style={[
                    styles.dividerLine,
                    { backgroundColor: theme.colors.outlineVariant },
                  ]}
                />
                <Text
                  style={[
                    styles.socialDividerText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  o continúa con
                </Text>
                <View
                  style={[
                    styles.dividerLine,
                    { backgroundColor: theme.colors.outlineVariant },
                  ]}
                />
              </View>

              {/* Google Social Button */}
              <Pressable
                onPress={handleGoogleLogin}
                disabled={loading}
                style={({ pressed }) => [
                  styles.socialButtonContainer,
                  {
                    opacity: loading ? 0.6 : pressed ? 0.9 : 1,
                  },
                ]}
              >
                <SquircleView
                  style={[
                    styles.socialButton,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: "rgba(255,255,255,0.1)",
                      borderWidth: 1,
                    },
                  ]}
                  cornerSmoothing={1}
                >
                  <View style={styles.socialButtonContent}>
                    <Ionicons
                      name="logo-google"
                      size={20}
                      color={theme.colors.onSurface}
                    />
                    <Text
                      style={[
                        styles.socialButtonText,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      Google
                    </Text>
                  </View>
                </SquircleView>
              </Pressable>
            </Animated.View>

            {/* Footer Section */}
            <Animated.View
              entering={FadeInDown.duration(400).delay(200)}
              style={styles.footer}
              renderToHardwareTextureAndroid={true}
            >
              <Text style={{ color: theme.colors.onSurfaceVariant }}>
                ¿No tienes cuenta?
              </Text>
              <TouchableOpacity onPress={() => router.push("/auth/register")}>
                <Text
                  style={[
                    styles.registerLink,
                    { color: theme.colors.tertiary },
                  ]}
                >
                  Regístrate
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
  socialDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 32,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  socialDividerText: {
    paddingHorizontal: 12,
    fontSize: 13,
    fontFamily: "Archivo-Medium",
  },
  socialButtonContainer: {
    width: "100%",
    marginBottom: 16,
  },
  socialButton: {
    paddingVertical: 14,
    borderRadius: 100,
  },
  socialButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  socialButtonText: {
    fontFamily: "Archivo-Bold",
    fontSize: 16,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
  },
  registerLink: {
    fontFamily: "Archivo-Bold",
    fontSize: 15,
  },
});
