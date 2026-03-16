import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Colors } from "../constants/Colors";
import { useAuth } from "../hooks";
import { groupsService } from "../services/groups.service";

// Root index - Invisible Router
export default function Index() {
  const { isAuthenticated, isLoading, isProfileLoading, profile } = useAuth();
  const [isCheckingGroups, setIsCheckingGroups] = useState(true);
  const [hasGroups, setHasGroups] = useState(false);

  useEffect(() => {
    const checkGroups = async () => {
      if (isAuthenticated && profile) {
        try {
          // We can use a lightweight query if available, or just getMyGroups
          // getMyGroups fetches everything which is heavy, but for now it's okay.
          // Optimization: create a checkUserGroupsStatus method later.
          const groups = await groupsService.getMyGroups();
          setHasGroups(groups.length > 0);
        } catch (error) {
          console.error("Error checking groups:", error);
          // If error, maybe assume no groups or retry?
          // Safe bet: assume no groups and let TheSplit handle it or show error logic
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

  // Show loading while checking auth, profile, or groups
  if (
    isLoading ||
    isProfileLoading ||
    (isAuthenticated && profile && isCheckingGroups)
  ) {
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

  // 1. Not Authenticated -> Login
  if (!isAuthenticated) {
    return <Redirect href="/auth/login" />;
  }

  // 2. Authenticated but No Profile -> Profile Setup
  if (!profile) {
    return <Redirect href="/profileSetup" />;
  }

  // 3. Authenticated, Profile, but No Groups -> The Split
  if (!hasGroups) {
    return <Redirect href="/theSplit" />;
  }

  // 4. Authenticated, Profile, Groups -> Home
  return <Redirect href="/(tabs)/home" />;
}
