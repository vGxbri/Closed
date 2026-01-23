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
import { Button, HelperText, Text, TextInput, useTheme } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { CustomHeader } from "../../components/ui/CustomHeader";
import { useSnackbar } from "../../components/ui/SnackbarContext";
import { theme as appTheme } from "../../constants/theme";
import { useAuth } from "../../hooks";

export default function RegisterScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
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
      // Handle specific Supabase error codes
      let message = "Error al registrarse";
      
      const errorMessage = err?.message || "";
      const errorMsg = errorMessage.toLowerCase();
      
      if (errorMsg.includes("user already registered") || 
          errorMsg.includes("already exists") ||
          errorMsg.includes("duplicate")) {
        message = "Este correo ya está registrado. Intenta iniciar sesión.";
      } else if (errorMsg.includes("invalid email") || errorMsg.includes("email is invalid")) {
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={["left", "right"]}>
      <CustomHeader title="Crear Cuenta" />
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            { paddingTop: 24, paddingBottom: 32, justifyContent: 'center', flexGrow: 1 }
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
            {/* Title moved to CustomHeader */}
            <Text variant="bodyLarge" style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              Únete a nuestra familia
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <TextInput
              label="Nombre completo"
              placeholder="Tu nombre"
              value={displayName}
              onChangeText={setDisplayName}
              mode="outlined"
              left={<TextInput.Icon icon="account-outline" />}
              style={styles.input}
              outlineStyle={{ borderColor: theme.colors.secondaryContainer, borderRadius: 16 }}
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
              outlineStyle={{ borderColor: theme.colors.secondaryContainer, borderRadius: 16 }}
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
                outlineStyle={{ borderColor: theme.colors.secondaryContainer, borderRadius: 16 }}
              />
              {passwordTooShort && (
                <HelperText type="error" visible style={{ marginTop: -12, marginBottom: 8 }}>
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
                    icon={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  />
                }
                error={!!passwordsDoNotMatch}
                style={styles.input}
                outlineStyle={{ borderColor: theme.colors.secondaryContainer, borderRadius: 16 }}
              />
              {passwordsDoNotMatch && (
                <HelperText type="error" visible style={{ marginTop: -12, marginBottom: 8 }}>
                  Las contraseñas no coinciden
                </HelperText>
              )}
            </View>

            <Button
              mode="contained"
              onPress={handleRegister}
              loading={loading}
              disabled={!isFormValid}
              style={[styles.button, { 
                backgroundColor: theme.colors.primary,
                borderWidth: 1,
                borderColor: theme.colors.primary 
              }]}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
            >
              Crear Cuenta
            </Button>
          </View>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.outlineVariant }]} />
            <Text variant="labelMedium" style={{ color: theme.colors.onSurfaceVariant, paddingHorizontal: 12 }}>
              o
            </Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.colors.outlineVariant }]} />
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              ¿Ya tienes cuenta?
            </Text>
            <TouchableOpacity onPress={() => router.push("/auth/login")}>
              <Text variant="bodyMedium" style={[styles.link, { color: theme.colors.tertiary }]}>
                Inicia sesión
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
    marginBottom: 32,
  },
  logoContainer: {
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginBottom: 24,
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
    marginBottom: 24,
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
