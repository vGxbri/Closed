import { Stack } from "expo-router";
import { useTheme } from "react-native-paper";

export default function GroupsStackLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.surface },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: { fontWeight: "700", fontSize: 20 },
        headerShadowVisible: true,
        animation: "default",
        gestureEnabled: true,
        contentStyle: { backgroundColor: theme.colors.background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{ headerShown: false, gestureEnabled: false }}
      />
      <Stack.Screen name="group/[id]" options={{ title: "Grupo" }} />
      <Stack.Screen
        name="group/create"
        options={{ title: "Crear Grupo", presentation: "modal" }}
      />
      <Stack.Screen
        name="group/join"
        options={{ title: "Unirse a grupo", presentation: "modal" }}
      />
      {/* Añade aquí las rutas de award si las has movido */}
    </Stack>
  );
}
