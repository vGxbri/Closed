import { Stack } from "expo-router";
import { useTheme } from "react-native-paper";

export default function AuthLayout() {
  const theme = useTheme();

  return (
    <Stack
      screenOptions={{
        animation: "fade_from_bottom",
        animationDuration: 200,
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTintColor: theme.colors.primary,
        headerTitleStyle: {
          fontWeight: "600",
        },
        headerShadowVisible: false,
        contentStyle: {
          backgroundColor: theme.colors.background,
        },
      }}
    >
      <Stack.Screen
        name="login"
        options={{
          title: "",
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          title: "",
          headerShown: false, // Hide header for consistency
        }}
      />
    </Stack>
  );
}
