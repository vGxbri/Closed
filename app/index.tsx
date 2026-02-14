import { Redirect } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { Colors } from "../constants/Colors";
import { useAuth } from "../hooks";

// Root index - redirect based on auth state
export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading while checking auth
  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: Colors.background,
        }}
      >
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  // Redirect based on authentication
  if (isAuthenticated) {
    return <Redirect href="/(tabs)/home" />;
  }

  // Not authenticated - go to chooseGroup screen
  return <Redirect href="/chooseGroup" />;
}
