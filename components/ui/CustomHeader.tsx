import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

interface CustomHeaderProps {
  title: string;
  showBackButton?: boolean;
  rightAction?: React.ReactNode;
  onBackPress?: () => void;
}

export const CustomHeader = ({
  title,
  showBackButton = true,
  rightAction,
  onBackPress,
}: CustomHeaderProps) => {
  const router = useRouter();
  const theme = useTheme();

  const handleBack = () => {
    if (onBackPress) {
      onBackPress();
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: theme.colors.background }]}
      edges={["top"]}
    >
      <View style={styles.container}>
        {showBackButton && (
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color={theme.colors.onSurface}
              style={{ marginLeft: -2 }}
            />
          </TouchableOpacity>
        )}
        <Text
          style={[styles.title, { color: theme.colors.onSurface }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {rightAction && <View style={styles.rightAction}>{rightAction}</View>}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    width: "100%",
  },
  container: {
    height: 56, // Standard mobile header height
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    width: "100%",
  },
  backButton: {
    marginRight: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "400", // MD3 uses lighter weights for headlines usually, or 500
    letterSpacing: 0,
    flex: 1,
  },
  rightAction: {
    marginLeft: 16,
    justifyContent: "center",
    alignItems: "center",
  },
});
