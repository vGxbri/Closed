import { Ionicons } from "@expo/vector-icons";
import { BlurTargetView } from "expo-blur";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Text, useTheme } from "react-native-paper";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { ConfirmDialog } from "../components/ui/ConfirmDialog";
import { useAuth } from "../hooks";

export default function TheSplit() {
  const router = useRouter();
  const theme = useTheme();
  const { signOut } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const backgroundRef = useRef(null);

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await signOut();
    router.replace("/");
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      edges={["top", "left", "right", "bottom"]}
    >
      <BlurTargetView ref={backgroundRef} style={styles.container}>
        <View style={styles.content}>
          {/* Header Section */}
          <Animated.View
            entering={FadeInUp.duration(150)}
            style={styles.header}
          >
            <Text style={[styles.welcomeText, { color: theme.colors.primary }]}>
              Bienvenido a
            </Text>
            <Image
              source={
                theme.dark
                  ? require("../assets/images/logo_full_light.png")
                  : require("../assets/images/logo_full_dark.png")
              }
              style={styles.logo}
              contentFit="contain"
            />
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
              Tu círculo, tus reglas.
            </Text>
          </Animated.View>

          {/* CTA Section */}
          <Animated.View
            entering={FadeInDown.duration(150)}
            style={styles.actions}
          >
            {/* BOTÓN 1: Crear grupo */}
            <Pressable
              onPress={() => router.push("/createGroup")}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <SquircleView
                style={[
                  styles.ctaCard,
                  {
                    backgroundColor: theme.colors.primary,
                    borderRadius: 20,
                  },
                ]}
                cornerSmoothing={1}
              >
                <View style={styles.ctaContent}>
                  <View style={styles.ctaTextBlock}>
                    <Text
                      style={[
                        styles.ctaTitle,
                        { color: theme.colors.onPrimary },
                      ]}
                    >
                      Crear grupo
                    </Text>
                    <Text
                      style={[
                        styles.ctaDescription,
                        { color: theme.colors.onPrimary },
                      ]}
                    >
                      Empieza algo nuevo con tu gente
                    </Text>
                  </View>
                  <SquircleView
                    style={[
                      styles.ctaIcon,
                      {
                        backgroundColor: "rgba(255,255,255,0.15)",
                        borderColor: "rgba(255,255,255,0.3)",
                        borderWidth: 1,
                        borderRadius: 16,
                      },
                    ]}
                    cornerSmoothing={1}
                  >
                    <Ionicons
                      name="add"
                      size={24}
                      color={theme.colors.onPrimary}
                    />
                  </SquircleView>
                </View>
              </SquircleView>
            </Pressable>

            {/* BOTÓN 2: Unirme a un grupo */}
            <Pressable
              onPress={() => router.push("/join/joinGroup")}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <SquircleView
                style={[
                  styles.ctaCard,
                  {
                    backgroundColor: theme.colors.surfaceVariant,
                    borderRadius: 20,
                  },
                ]}
                cornerSmoothing={1}
              >
                <View style={styles.ctaContent}>
                  <View style={styles.ctaTextBlock}>
                    <Text
                      style={[
                        styles.ctaTitle,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      Unirme a un grupo
                    </Text>
                    <Text
                      style={[
                        styles.ctaDescription,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      Tengo un código de invitación
                    </Text>
                  </View>
                  <SquircleView
                    style={[
                      styles.ctaIcon,
                      {
                        backgroundColor: "rgba(255,255,255,0.15)",
                        borderColor: theme.colors.outline,
                        borderWidth: 1,
                        borderRadius: 16,
                      },
                    ]}
                    cornerSmoothing={1}
                  >
                    <Ionicons
                      name="arrow-forward"
                      size={24}
                      color={theme.colors.onSurface}
                    />
                  </SquircleView>
                </View>
              </SquircleView>
            </Pressable>

            {/* BOTÓN 3: Cerrar Sesión (SIN SQUIRCLE, VIEW NORMAL) */}
            <Pressable
              onPress={() => setShowLogoutModal(true)}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                  alignSelf: "center",
                  marginTop: 8,
                },
              ]}
            >
              <SquircleView
                style={[
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    backgroundColor:
                      theme.colors.errorContainer || "rgba(255, 59, 48, 0.1)",
                    borderRadius: 40,
                  },
                ]}
                cornerSmoothing={1}
              >
                <Ionicons
                  name="log-out-outline"
                  size={18}
                  color={theme.colors.error}
                />
                <Text
                  style={[styles.logoutText, { color: theme.colors.error }]}
                >
                  Cerrar Sesión
                </Text>
              </SquircleView>
            </Pressable>
          </Animated.View>
        </View>
      </BlurTargetView>

      <ConfirmDialog
        visible={showLogoutModal}
        title="Cerrar Sesión"
        message="¿Estás seguro de que quieres cerrar tu sesión?"
        confirmText="Salir"
        cancelText="Cancelar"
        type="error"
        onConfirm={handleLogout}
        onCancel={() => setShowLogoutModal(false)}
        blurTargetRef={backgroundRef}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: "space-between",
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    alignItems: "flex-start",
  },
  welcomeText: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 36,
    letterSpacing: 1,
  },
  logo: {
    width: "80%",
    aspectRatio: 3.1,
    alignSelf: "flex-start",
    marginTop: -16,
  },
  divider: {
    width: "85%",
    height: 1,
    marginTop: 4,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    letterSpacing: 0.5,
  },
  actions: {
    gap: 16,
  },
  ctaCard: {
    paddingVertical: 24,
    paddingHorizontal: 24,
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
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    // Quitamos de aquí el borderRadius, borderWidth y backgroundColor
    // porque ahora lo gestiona squircleParams
  },
  logoutButton: {
    alignSelf: "center",
    paddingVertical: 12,
    marginTop: 8,
  },
  logoutText: {
    fontSize: 14,
    letterSpacing: 0.5,
  },
});
