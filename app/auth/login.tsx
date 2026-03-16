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
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Button, Text, TextInput, useTheme } from "react-native-paper";
import {
  SafeAreaView
} from "react-native-safe-area-context";
import { CustomHeader } from "../../components/ui/CustomHeader";
import { useSnackbar } from "../../components/ui/SnackbarContext";
import { theme as appTheme } from "../../constants/theme";
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
      // Handle specific Supabase error codes
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

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["left", "right"]}
    >
      <CustomHeader title="Iniciar Sesión" showBackButton={false} />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            {
              paddingTop: 24,
              paddingBottom: 32,
              justifyContent: "center",
              flexGrow: 1,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Content */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={require("../../assets/images/Glow.png")}
                style={styles.logo}
                contentFit="contain"
              />
            </View>
            <Text
              variant="headlineLarge"
              style={[styles.title, { color: theme.colors.primary }]}
            >
              ¡Hola de nuevo!
            </Text>
            {/* Subtitle moved/removed or kept */}
            <Text
              variant="bodyLarge"
              style={[
                styles.subtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Inicia sesión para continuar
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
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
                borderColor: theme.colors.secondaryContainer,
                borderRadius: 16,
              }}
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
                borderColor: theme.colors.secondaryContainer,
                borderRadius: 16,
              }}
            />

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={!email.trim() || !password}
              style={[
                styles.button,
                {
                  backgroundColor: theme.colors.primary,
                  borderWidth: 1,
                  borderColor: theme.colors.primary,
                },
              ]}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              Iniciar Sesión
            </Button>
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View
              style={[
                styles.dividerLine,
                { backgroundColor: theme.colors.outlineVariant },
              ]}
            />
            <Text
              variant="labelMedium"
              style={{
                color: theme.colors.onSurfaceVariant,
                paddingHorizontal: 12,
              }}
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

          <Button
            mode="outlined"
            onPress={handleGoogleLogin}
            loading={loading}
            icon="google"
            style={[
              styles.button,
              {
                marginBottom: 24,
                marginTop: 0,
                borderColor: theme.colors.outline,
              },
            ]}
            textColor={theme.colors.onSurface}
            labelStyle={styles.buttonLabel}
          >
            Google
          </Button>

          {/* Footer */}
          <View style={styles.footer}>
            <Text
              variant="bodyMedium"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              ¿No tienes cuenta?
            </Text>
            <TouchableOpacity onPress={() => router.push("/auth/register")}>
              <Text
                variant="bodyMedium"
                style={[styles.link, { color: theme.colors.tertiary }]}
              >
                Regístrate
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: appTheme.spacing.xl,
  },
  header: {
    alignItems: "center",
    marginBottom: 40,
  },
  logoContainer: {
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 90,
    height: 90,
  },
  title: {
    fontWeight: "800",
    marginBottom: 0,
    letterSpacing: -1,
  },
  subtitle: {
    textAlign: "center",
    marginTop: 4,
  },
  form: {
    marginBottom: 32,
  },
  input: {
    marginBottom: 8,
  },
  button: {
    marginTop: 8,
    borderRadius: 16,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  link: {
    fontWeight: "700",
  },
});
