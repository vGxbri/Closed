import { DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { SnackbarProvider } from "../components/ui/SnackbarContext";
import { AuthProvider } from "../hooks/useAuth";

import { customColors, customColorsDark } from "../constants/Colors";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  
  const paperTheme = colorScheme === "dark" 
    ? { ...MD3DarkTheme, colors: { ...MD3DarkTheme.colors, ...customColorsDark } }
    : { ...MD3LightTheme, colors: { ...MD3LightTheme.colors, ...customColors } };

  // React Navigation theme (controls transition backgrounds)
  const navigationTheme = colorScheme === "dark"
    ? {
        ...NavigationDarkTheme,
        colors: {
          ...NavigationDarkTheme.colors,
          primary: customColorsDark.primary,
          background: customColorsDark.background,
          card: customColorsDark.background, // Same as background for consistent transitions
          text: customColorsDark.onSurface,
          border: customColorsDark.outline,
          notification: customColorsDark.primary,
        },
      }
    : {
        ...NavigationDefaultTheme,
        colors: {
          ...NavigationDefaultTheme.colors,
          primary: customColors.primary,
          background: customColors.background,
          card: customColors.background, // Same as background for consistent transitions
          text: customColors.onSurface,
          border: customColors.outline,
          notification: customColors.primary,
        },
      };

  return (
    <AuthProvider>
      <SafeAreaProvider>
        <ThemeProvider value={navigationTheme}>
          <PaperProvider theme={paperTheme}>
            <SnackbarProvider>
              <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
              <Stack
                screenOptions={{
                  headerShown: false,
                  animation: 'default',
                  fullScreenGestureEnabled: true,
                  contentStyle: { backgroundColor: paperTheme.colors.background }, // Ensures no black void on resize
                }}
              />
            </SnackbarProvider>
          </PaperProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </AuthProvider>
  );
}
