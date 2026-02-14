import {
  DarkTheme as NavigationDarkTheme,
  DefaultTheme as NavigationDefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  configureFonts,
  MD3DarkTheme,
  MD3LightTheme,
  PaperProvider,
} from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { SnackbarProvider } from "../components/ui/SnackbarContext";
import { customColors, customColorsDark } from "../constants/Colors";
import { AuthProvider } from "../hooks/useAuth";

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const fontConfig = {
  fontFamily: "Archivo-Regular",
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    // Archivo
    "Archivo-Black": require("../assets/fonts/Archivo/Archivo-Black.otf"),
    "Archivo-BlackItalic": require("../assets/fonts/Archivo/Archivo-BlackItalic.otf"),
    "Archivo-Bold": require("../assets/fonts/Archivo/Archivo-Bold.otf"),
    "Archivo-BoldItalic": require("../assets/fonts/Archivo/Archivo-BoldItalic.otf"),
    "Archivo-ExtraBold": require("../assets/fonts/Archivo/Archivo-ExtraBold.otf"),
    "Archivo-ExtraBoldItalic": require("../assets/fonts/Archivo/Archivo-ExtraBoldItalic.otf"),
    "Archivo-ExtraLight": require("../assets/fonts/Archivo/Archivo-ExtraLight.otf"),
    "Archivo-ExtraLightItalic": require("../assets/fonts/Archivo/Archivo-ExtraLightItalic.otf"),
    "Archivo-Italic": require("../assets/fonts/Archivo/Archivo-Italic.otf"),
    "Archivo-Light": require("../assets/fonts/Archivo/Archivo-Light.otf"),
    "Archivo-LightItalic": require("../assets/fonts/Archivo/Archivo-LightItalic.otf"),
    "Archivo-Medium": require("../assets/fonts/Archivo/Archivo-Medium.otf"),
    "Archivo-MediumItalic": require("../assets/fonts/Archivo/Archivo-MediumItalic.otf"),
    "Archivo-Regular": require("../assets/fonts/Archivo/Archivo-Regular.otf"),
    "Archivo-SemiBold": require("../assets/fonts/Archivo/Archivo-SemiBold.otf"),
    "Archivo-SemiBoldItalic": require("../assets/fonts/Archivo/Archivo-SemiBoldItalic.otf"),
    "Archivo-Thin": require("../assets/fonts/Archivo/Archivo-Thin.otf"),
    "Archivo-ThinItalic": require("../assets/fonts/Archivo/Archivo-ThinItalic.otf"),

    // Clash Display
    "ClashDisplay-Bold": require("../assets/fonts/ClashDisplay/ClashDisplay-Bold.otf"),
    "ClashDisplay-Extralight": require("../assets/fonts/ClashDisplay/ClashDisplay-Extralight.otf"),
    "ClashDisplay-Light": require("../assets/fonts/ClashDisplay/ClashDisplay-Light.otf"),
    "ClashDisplay-Medium": require("../assets/fonts/ClashDisplay/ClashDisplay-Medium.otf"),
    "ClashDisplay-Regular": require("../assets/fonts/ClashDisplay/ClashDisplay-Regular.otf"),
    "ClashDisplay-Semibold": require("../assets/fonts/ClashDisplay/ClashDisplay-Semibold.otf"),

    // Other
    "InstrumentSerif-Italic": require("../assets/fonts/other/InstrumentSerif-Italic.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  const paperTheme =
    colorScheme === "dark"
      ? {
          ...MD3DarkTheme,
          fonts: configureFonts({ config: fontConfig }),
          colors: { ...MD3DarkTheme.colors, ...customColorsDark },
        }
      : {
          ...MD3LightTheme,
          fonts: configureFonts({ config: fontConfig }),
          colors: { ...MD3LightTheme.colors, ...customColors },
        };

  // React Navigation theme (controls transition backgrounds)
  const navigationTheme =
    colorScheme === "dark"
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

  if (!loaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <SafeAreaProvider>
          <ThemeProvider value={navigationTheme}>
            <PaperProvider theme={paperTheme}>
              <SnackbarProvider>
                <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
                <Stack
                  screenOptions={{
                    headerShown: false,
                    animation: "default",
                    contentStyle: {
                      backgroundColor: paperTheme.colors.background,
                    },
                  }}
                >
                  <Stack.Screen
                    name="(tabs)"
                    options={{ gestureEnabled: false }}
                  />
                  <Stack.Screen
                    name="auth"
                    options={{ gestureEnabled: false }}
                  />
                  <Stack.Screen
                    name="index"
                    options={{ gestureEnabled: false }}
                  />
                  <Stack.Screen
                    name="chooseGroup"
                    options={{ gestureEnabled: false }}
                  />
                </Stack>
              </SnackbarProvider>
            </PaperProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
