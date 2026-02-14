import { Stack } from "expo-router";
import { useTheme } from "react-native-paper";

export default function HomeStackLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: {
          fontWeight: "700",
          fontSize: 20,
        },
        headerShadowVisible: true,
        animation: "default", // Vuelvo a default para asegurar soporte de predictive back nativo
        gestureEnabled: true, // Habilitar gestos explícitamente para hijas
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false, // No navbar on main home page
          gestureEnabled: false, // Prevent back gesture from Home root exiting app or doing nothing
        }}
      />
      <Stack.Screen
        name="group/[id]"
        options={{
          title: "Grupo",
        }}
      />
      <Stack.Screen
        name="group/create"
        options={{
          title: "Crear Grupo",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="award/create"
        options={{
          title: "Crear Premio",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="group/join"
        options={{
          title: "Unirse a grupo",
          presentation: "modal",
        }}
      />
      <Stack.Screen
        name="group/members"
        options={{
          title: "Miembros",
        }}
      />
    </Stack>
  );
}
