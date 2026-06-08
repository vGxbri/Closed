/**
 * Punto de entrada y enrutamiento inicial
 * Evalúa sesión, perfil y grupos del usuario para redirigir a login, perfil, onboarding o la lista de grupos.
 */
import { Redirect, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";
import { CircleLoadingIndicator } from "@/components/premade/molecules/circle-loader";
import { useAuth } from "@/hooks";
import { groupsService } from "@/services";

export default function Index() {
  const { isAuthenticated, isLoading, isProfileLoading, profile } = useAuth();
  const theme = useTheme();
  const [isCheckingGroups, setIsCheckingGroups] = useState(true);
  const [hasGroups, setHasGroups] = useState(false);
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const checkGroups = async () => {
      if (isAuthenticated && profile) {
        try {
          const groups = await groupsService.getMyGroups();
          setHasGroups(groups.length > 0);
        } catch {
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

  if (
    isLoading ||
    isProfileLoading ||
    (isAuthenticated && profile && isCheckingGroups) ||
    !minTimeElapsed
  ) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Stack.Screen options={{ animation: "fade", headerShown: false }} />

        <CircleLoadingIndicator
          dotSpacing={8}
          dotColor={theme.colors.onBackground}
          duration={500}
        />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/auth/login" />;
  }

  if (!profile) {
    return <Redirect href="/profileSetup" />;
  }

  if (!hasGroups) {
    return <Redirect href="/theSplit" />;
  }

  return <Redirect href="/(tabs)/groups" />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
