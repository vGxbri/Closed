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

export type DialogType = "success" | "error" | "warning" | "info" | "confirm";

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  onConfirm?: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  type?: DialogType;
  showCancel?: boolean;
  // NUEVO: Referencia al fondo que queremos difuminar (necesario para Android SDK 55)
  blurTargetRef?: React.RefObject<any>;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  visible,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Aceptar",
  cancelText = "Cancelar",
  type = "info",
  showCancel = true,
  blurTargetRef, // Lo recibimos por props
}) => {
  const theme = useTheme();
  const opacityAnim = React.useRef(new Animated.Value(0)).current;
  const [shouldRender, setShouldRender] = React.useState(visible);

  React.useEffect(() => {
    if (visible) {
      setShouldRender(true);
      opacityAnim.setValue(0);

      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setShouldRender(false);
      });
    }
  }, [visible, opacityAnim]);

  const getIconConfig = (): {
    name: keyof typeof Ionicons.glyphMap;
    color: string;
    bgColor: string;
  } => {
    switch (type) {
      case "success":
        return {
          name: "checkmark-circle",
          color: "#4CAF50",
          bgColor: "#4CAF5020",
        };
      case "error":
        return {
          name: "close-circle",
          color: theme.colors.error,
          bgColor: `${theme.colors.error}20`,
        };
      case "warning":
        return { name: "warning", color: "#FF9800", bgColor: "#FF980020" };
      case "confirm":
        return {
          name: "help-circle",
          color: theme.colors.primary,
          bgColor: `${theme.colors.primary}20`,
        };
      default:
        return {
          name: "information-circle",
          color: theme.colors.primary,
          bgColor: `${theme.colors.primary}20`,
        };
    }
  };

  const iconConfig = getIconConfig();

  const getConfirmButtonStyle = () => {
    switch (type) {
      case "error":
        return {
          backgroundColor: theme.colors.errorContainer,
          borderColor: theme.colors.error,
        };
      case "warning":
        return { backgroundColor: "#FF980020", borderColor: "#FF9800" };
      case "success":
        return { backgroundColor: "#4CAF5020", borderColor: "#4CAF50" };
      default:
        return {
          backgroundColor: theme.colors.primaryContainer,
          borderColor: theme.colors.primary,
        };
    }
  };

  const getConfirmTextColor = () => {
    switch (type) {
      case "error":
        return theme.colors.error;
      case "warning":
        return "#FF9800";
      case "success":
        return "#4CAF50";
      default:
        return theme.colors.onSurface;
    }
  };

  if (!shouldRender) return null;

  return (
    <Portal>
      <View style={styles.container}>
        {/* Backdrop */}
        <Pressable style={styles.backdrop} onPress={onCancel}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { opacity: opacityAnim, backgroundColor: "rgba(0,0,0,0.4)" },
            ]}
          >
            <BlurView
              intensity={40}
              tint="dark"
              blurMethod="dimezisBlurView"
              blurTarget={blurTargetRef}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </Pressable>

        {/* Dialog */}
        <Animated.View
          style={[
            styles.dialogContainer,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.surfaceVariant,
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Icon */}
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: iconConfig.bgColor,
                borderColor: iconConfig.color,
              },
            ]}
          >
            <Ionicons
              name={iconConfig.name}
              size={40}
              color={iconConfig.color}
            />
          </View>

          {/* Title */}
          <Text
            variant="titleLarge"
            style={[styles.title, { color: theme.colors.onSurface }]}
          >
            {title}
          </Text>

          {/* Message */}
          <Text
            variant="bodyMedium"
            style={[styles.message, { color: theme.colors.onSurfaceVariant }]}
          >
            {message}
          </Text>

          {/* Actions */}
          <View style={styles.actions}>
            {showCancel && (
              <TouchableOpacity
                style={[
                  styles.cancelButton,
                  { borderColor: theme.colors.surfaceVariant },
                ]}
                onPress={onCancel}
                activeOpacity={0.7}
              >
                <Text
                  variant="labelLarge"
                  style={{
                    color: theme.colors.onSurfaceVariant,
                    fontWeight: "600",
                  }}
                >
                  {cancelText}
                </Text>
              </TouchableOpacity>
            )}
            {onConfirm && (
              <TouchableOpacity
                style={[styles.confirmButton, getConfirmButtonStyle()]}
                onPress={() => {
                  onConfirm();
                  onCancel();
                }}
                activeOpacity={0.7}
              >
                <Text
                  variant="labelLarge"
                  style={{ color: getConfirmTextColor(), fontWeight: "700" }}
                >
                  {confirmText}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </View>
    </Portal>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  dialogContainer: {
    width: "88%",
    maxWidth: 360,
    borderRadius: 24,
    padding: 28,
    paddingTop: 32,
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 24,
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
  },
  title: {
    fontWeight: "700",
    textAlign: "center",
    marginBottom: 10,
    letterSpacing: -0.3,
  },
  message: {
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 22,
    paddingHorizontal: 8,
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  confirmButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
});
