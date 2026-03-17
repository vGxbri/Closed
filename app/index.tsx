import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";
import { CircleLoadingIndicator } from "../components/premade/molecules/circle-loader";
import { useAuth } from "../hooks";
import { groupsService } from "../services";

// Root index - Invisible Router that handles initial redirection
export default function Index() {
  const { isAuthenticated, isLoading, isProfileLoading, profile } = useAuth();
  const theme = useTheme();
  const [isCheckingGroups, setIsCheckingGroups] = useState(true);
  const [hasGroups, setHasGroups] = useState(false);

  // 1. ESTADO: Controla si ya ha pasado nuestro tiempo mínimo de gracia (1 seg)
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  // 2. EFFECT: Arranca el cronómetro nada más abrir la app
  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 1000); // 1000ms garantizados para evitar parpadeos

    return () => clearTimeout(timer); // Limpieza de seguridad
  }, []);

  useEffect(() => {
    const checkGroups = async () => {
      // Only check groups if we are authenticated and have a profile
      if (isAuthenticated && profile) {
        try {
          const groups = await groupsService.getMyGroups();
          setHasGroups(groups.length > 0);
        } catch (error) {
          console.error("Error checking groups in index:", error);
          setHasGroups(false);
        } finally {
          setIsCheckingGroups(false);
        }
      } else if (!isAuthenticated) {
        setIsCheckingGroups(false);
      }
    };

    if (!isLoading && !isProfileLoading) {
      if (isAuthenticated && profile) {
        checkGroups();
      } else {
        setIsCheckingGroups(false);
      }
    }
  }, [isAuthenticated, profile, isLoading, isProfileLoading]);

  // 3. Renderizamos el nuevo CircleLoadingIndicator
  if (
    isLoading ||
    isProfileLoading ||
    (isAuthenticated && profile && isCheckingGroups) ||
    !minTimeElapsed // <-- El guardián del tiempo
  ) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <CircleLoadingIndicator
          dotSpacing={8}
          dotColor={theme.colors.onBackground}
          duration={500}
        />
      </View>
    );
  }

  // Navigation Logic
  // 1. Not Authenticated -> Send to Login
  if (!isAuthenticated) {
    return <Redirect href="/auth/login" />;
  }

  // 2. Authenticated but No Profile -> Send to Profile Setup
  if (!profile) {
    return <Redirect href="/profileSetup" />;
  }

  // 3. Authenticated, Profile, but No Groups -> Send to The Split (Group Selection)
  if (!hasGroups) {
    return <Redirect href="/theSplit" />;
  }

  // 4. Authenticated, Profile, Groups -> Send to Home Tabs
  return <Redirect href="/(tabs)/home" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
