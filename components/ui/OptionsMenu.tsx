import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React from "react";
import {
    Animated,
    Pressable,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { Portal, Text, useTheme } from "react-native-paper";

export interface MenuOption {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  action: () => void;
  isDestructive?: boolean;
}

interface OptionsMenuProps {
  visible: boolean;
  title: string;
  options: MenuOption[];
  onDismiss: () => void;
}

export const OptionsMenu: React.FC<OptionsMenuProps> = ({
  visible,
  title,
  options,
  onDismiss,
}) => {
  const theme = useTheme();
  const opacityAnim = React.useRef(new Animated.Value(0)).current;
  const translateYAnim = React.useRef(new Animated.Value(400)).current;
  const [shouldRender, setShouldRender] = React.useState(visible);

  React.useEffect(() => {
    if (visible) {
      setShouldRender(true);
      opacityAnim.setValue(0);
      translateYAnim.setValue(400);

      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(translateYAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateYAnim, {
          toValue: 400,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShouldRender(false);
      });
    }
  }, [visible, opacityAnim, translateYAnim]);

  const handleOptionPress = (option: MenuOption) => {
    onDismiss();
    setTimeout(() => option.action(), 250);
  };

  if (!shouldRender) return null;

  return (
    <Portal>
      <View style={styles.container}>
        {/* Backdrop */}
        <Pressable style={styles.backdrop} onPress={onDismiss}>
          <Animated.View
            style={[StyleSheet.absoluteFill, { opacity: opacityAnim }]}
          >
            <BlurView
              intensity={25}
              tint="dark"
              style={StyleSheet.absoluteFill}
              blurMethod="dimezisBlurView"
            />
          </Animated.View>
        </Pressable>

        {/* Menu */}
        <Animated.View
          style={[
            styles.menuContainer,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.surfaceVariant,
              transform: [{ translateY: translateYAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Handle bar */}
          <View
            style={[
              styles.handleBar,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
          />

          {/* Title */}
          <Text
            variant="titleMedium"
            style={[styles.title, { color: theme.colors.onSurfaceVariant }]}
          >
            {title}
          </Text>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {options.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionRow,
                  {
                    backgroundColor: option.isDestructive
                      ? `${theme.colors.error}10`
                      : theme.colors.surfaceVariant + "40",
                    borderColor: option.isDestructive
                      ? `${theme.colors.error}30`
                      : theme.colors.surfaceVariant,
                  },
                ]}
                onPress={() => handleOptionPress(option)}
                activeOpacity={0.7}
              >
                {option.icon && (
                  <View
                    style={[
                      styles.iconContainer,
                      {
                        backgroundColor: option.isDestructive
                          ? `${theme.colors.error}20`
                          : theme.colors.primaryContainer,
                      },
                    ]}
                  >
                    <Ionicons
                      name={option.icon}
                      size={20}
                      color={
                        option.isDestructive
                          ? theme.colors.error
                          : theme.colors.onSurface
                      }
                    />
                  </View>
                )}
                <Text
                  variant="bodyLarge"
                  style={[
                    styles.optionLabel,
                    {
                      color: option.isDestructive
                        ? theme.colors.error
                        : theme.colors.onSurface,
                      marginLeft: option.icon ? 0 : 4,
                    },
                  ]}
                >
                  {option.label}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={
                    option.isDestructive
                      ? theme.colors.error
                      : theme.colors.onSurfaceVariant
                  }
                />
              </TouchableOpacity>
            ))}
          </View>

          {/* Cancel button */}
          <TouchableOpacity
            style={[
              styles.cancelButton,
              { borderColor: theme.colors.surfaceVariant },
            ]}
            onPress={onDismiss}
            activeOpacity={0.7}
          >
            <Text
              variant="labelLarge"
              style={{
                color: theme.colors.onSurfaceVariant,
                fontWeight: "600",
              }}
            >
              Cancelar
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Portal>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "flex-end",
    alignItems: "center",
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  menuContainer: {
    width: "100%",
    maxWidth: 500,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 34,
    borderWidth: 1,
    borderBottomWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: {
    textAlign: "center",
    marginBottom: 20,
    fontWeight: "600",
  },
  optionsContainer: {
    gap: 10,
    marginBottom: 16,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  optionLabel: {
    flex: 1,
    fontWeight: "600",
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
});
