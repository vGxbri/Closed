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
      <Stack.Screen name="group/[id]" options={{ headerShown: false }} />
      <Stack.Screen
        name="group/widgets"
        options={{ title: "Explorar Widgets", presentation: "modal" }}
      />
      <Stack.Screen
        name="group/gallery"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="group/sharedExpenses"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="group/awards"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="group/createExpense"
        options={{ title: "Nuevo Gasto", presentation: "modal" }}
      />
      <Stack.Screen
        name="group/flashback"
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="group/flashbackCamera"
        options={{ headerShown: false, animation: "fade" }}
      />
      <Stack.Screen
        name="group/flashbackParty"
        options={{ headerShown: false }}
      />
    </Stack>
  );
}
