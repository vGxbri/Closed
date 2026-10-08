/**
 * Onboarding sin grupos
 * Pantalla de bienvenida que ofrece crear un grupo, unirse con código o cerrar sesión.
 */
import { CTAButton } from "@/components/ui/CTAButton";
import { Ionicons } from "@expo/vector-icons";
import { BlurTargetView } from "expo-blur";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import Animated, {
  FadeInDown,
  FadeInUp,
  useReducedMotion,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { GrainyGradient } from "@/components/premade/organisms/grainy-gradient";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAuth } from "@/hooks";

export default function TheSplit() {
  const router = useRouter();
  const theme = useTheme();
  const { signOut } = useAuth();
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const reduceMotion = useReducedMotion();

  const backgroundRef = useRef(null);

  const handleLogout = async () => {
    setShowLogoutModal(false);
    await signOut();
    router.replace("/");
  };

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

      <SafeAreaView
        style={styles.safeArea}
        edges={["top", "left", "right", "bottom"]}
      >
        <BlurTargetView ref={backgroundRef} style={styles.safeArea}>
          <View style={styles.content}>
            <Animated.View
              entering={FadeInUp.duration(150)}
              style={styles.header}
            >
              {/* Texto y logo se leen como un único encabezado */}
              <View
                accessible
                accessibilityRole="header"
                accessibilityLabel="Bienvenido a Closed"
                style={styles.welcome}
              >
                <Text
                  maxFontSizeMultiplier={1.4}
                  style={[styles.welcomeText, { color: theme.colors.primary }]}
                >
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
              </View>
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

            <Animated.View
              entering={FadeInDown.duration(150)}
              style={styles.actions}
            >
              <CTAButton
                title="Crear grupo"
                description="Empieza algo nuevo con tu gente"
                iconName="add"
                onPress={() => router.push("/createGroup")}
              />

              <CTAButton
                title="Unirme a un grupo"
                description="Tengo un código de invitación"
                iconName="arrow-forward"
                backgroundColor={theme.colors.surfaceVariant}
                textColor={theme.colors.onSurface}
                iconBorderColor={theme.colors.outline}
                onPress={() => router.push("/join/joinGroup")}
              />

              <Pressable
                onPress={() => setShowLogoutModal(true)}
                accessibilityRole="button"
                hitSlop={8}
                style={({ pressed }) => [
                  styles.logoutButton,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Ionicons
                  name="log-out-outline"
                  size={18}
                  color={theme.colors.error}
                />
                <Text
                  style={[styles.logoutText, { color: theme.colors.error }]}
                >
                  Cerrar sesión
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
  welcome: {
    width: "100%",
  },
  welcomeText: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 36,
    letterSpacing: 1,
    paddingVertical: 5,
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
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
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
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 8,
    marginTop: 4,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  logoutText: {
    fontFamily: "Archivo-Bold",
    fontSize: 15,
  },
});
