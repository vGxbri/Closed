import { Ionicons } from "@expo/vector-icons";
import { BlurTargetView } from "expo-blur";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
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
            entering={FadeInUp.duration(600)}
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
            entering={FadeInDown.duration(600).delay(200)}
            style={styles.actions}
          >
            <Pressable
              onPress={() => router.push("/createGroup")}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <View
                style={[
                  styles.ctaCard,
                  { backgroundColor: theme.colors.primary, borderRadius: 24 },
                ]}
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
                  <View
                    style={[
                      styles.ctaIcon,
                      { borderColor: "rgba(255,255,255,0.3)" },
                    ]}
                  >
                    <Ionicons
                      name="add"
                      size={24}
                      color={theme.colors.onPrimary}
                    />
                  </View>
                </View>
              </View>
            </Pressable>

            <Pressable
              onPress={() => router.push("/join/joinGroup")}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
            >
              <View
                style={[
                  styles.ctaCard,
                  {
                    backgroundColor: theme.colors.surfaceVariant,
                    borderRadius: 24,
                  },
                ]}
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
                  <View
                    style={[
                      styles.ctaIcon,
                      { borderColor: theme.colors.outline },
                    ]}
                  >
                    <Ionicons
                      name="arrow-forward"
                      size={24}
                      color={theme.colors.onSurface}
                    />
                  </View>
                </View>
              </View>
            </Pressable>

            <Pressable
              onPress={() => setShowLogoutModal(true)}
              style={styles.logoutButton}
            >
              <Text style={[styles.logoutText, { color: theme.colors.error }]}>
                Cerrar Sesión
              </Text>
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
    borderRadius: 24,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
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
