/**
 * Punto de entrada y enrutamiento inicial
 * Evalúa sesión, perfil y grupos del usuario para redirigir a login, perfil, onboarding o la lista de grupos.
 */
import { Redirect, Stack } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";
import { CircleLoadingIndicator } from "@/components/premade/molecules/circle-loader";
import { CTAButton } from "@/components/ui/CTAButton";
import { StatusView } from "@/components/ui/StatusView";
import { useAuth } from "@/hooks";
import { groupsService } from "@/services";

export default function Index() {
  const {
    isAuthenticated,
    isLoading,
    isProfileLoading,
    profile,
    profileError,
    refreshProfile,
  } = useAuth();
  const theme = useTheme();
  const [isCheckingGroups, setIsCheckingGroups] = useState(true);
  const [hasGroups, setHasGroups] = useState(false);
  const [groupsError, setGroupsError] = useState(false);
  const [groupsAttempt, setGroupsAttempt] = useState(0);
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
          setGroupsError(true);
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
  }, [isAuthenticated, profile, isLoading, isProfileLoading, groupsAttempt]);

  const handleRetry = () => {
    if (!profile) {
      refreshProfile();
      return;
    }

    setGroupsError(false);
    setIsCheckingGroups(true);
    setGroupsAttempt((attempt) => attempt + 1);
  };

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

  // No se ha podido consultar el perfil o los grupos. No es lo mismo que no tenerlos:
  // mandar aquí a configurar el perfil o a la bienvenida trataría a esta cuenta como nueva.
  if ((!profile && profileError) || groupsError) {
    return (
      <StatusView
        icon="cloud-offline-outline"
        color={theme.colors.onSurfaceVariant}
        title="No se ha podido conectar"
        message="Comprueba tu conexión a internet y vuelve a intentarlo."
      >
        <CTAButton
          title="Reintentar"
          iconName="refresh"
          onPress={handleRetry}
        />
      </StatusView>
    );
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
