/**
 * Diálogo de confirmación
 * Modal para avisos, errores y acciones destructivas.
 * El fondo se difumina; en iOS 26+ el panel es Liquid Glass y en el resto una superficie opaca.
 */

import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import React from "react";
import {
  Animated,
  Easing,
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
  blurTargetRef?: React.RefObject<any>;
}

const glassAvailable = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

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
  blurTargetRef,
}) => {
  const theme = useTheme();
  const [anim] = React.useState(() => new Animated.Value(0));
  const [shouldRender, setShouldRender] = React.useState(visible);

  // Se monta en cuanto pasa a visible; se desmonta al terminar la animación de salida
  if (visible && !shouldRender) setShouldRender(true);

  React.useEffect(() => {
    if (visible) {
      anim.setValue(0);

      Animated.timing(anim, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(anim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }).start(() => {
        setShouldRender(false);
      });
    }
  }, [visible, anim]);

  const getTypeConfig = (): {
    icon: keyof typeof Ionicons.glyphMap;
    color: string;
    onColor: string;
  } => {
    switch (type) {
      case "success":
        return {
          icon: "checkmark-circle",
          color: "#2E7D32",
          onColor: "#FFFFFF",
        };
      case "error":
        return {
          icon: "alert-circle",
          color: theme.colors.error,
          onColor: theme.colors.onError,
        };
      case "warning":
        return { icon: "warning", color: "#E65100", onColor: "#FFFFFF" };
      case "confirm":
        return {
          icon: "help-circle",
          color: theme.colors.primary,
          onColor: theme.colors.onPrimary,
        };
      default:
        return {
          icon: "information-circle",
          color: theme.colors.primary,
          onColor: theme.colors.onPrimary,
        };
    }
  };

  const typeConfig = getTypeConfig();

  if (!shouldRender) return null;

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1],
  });

  const content = (
    <>
      <View
        style={[styles.iconChip, { backgroundColor: `${typeConfig.color}1F` }]}
      >
        <Ionicons name={typeConfig.icon} size={24} color={typeConfig.color} />
      </View>

      <Text style={[styles.title, { color: theme.colors.onSurface }]}>
        {title}
      </Text>

      <Text style={[styles.message, { color: theme.colors.onSurfaceVariant }]}>
        {message}
      </Text>

      <View style={styles.actions}>
        {showCancel && (
          <TouchableOpacity
            style={[
              styles.button,
              {
                backgroundColor: theme.dark
                  ? "rgba(255,255,255,0.12)"
                  : "rgba(0,0,0,0.06)",
              },
            ]}
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <Text
              style={[styles.buttonText, { color: theme.colors.onSurface }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {cancelText}
            </Text>
          </TouchableOpacity>
        )}
        {onConfirm && (
          <TouchableOpacity
            style={[styles.button, { backgroundColor: typeConfig.color }]}
            onPress={() => {
              onConfirm();
              onCancel();
            }}
            activeOpacity={0.8}
          >
            <Text
              style={[styles.buttonText, { color: typeConfig.onColor }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {confirmText}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  return (
    <Portal>
      <View style={styles.container}>
        <Pressable style={styles.backdrop} onPress={onCancel}>
          <Animated.View
            style={[
              StyleSheet.absoluteFill,
              { opacity: anim, backgroundColor: "rgba(0,0,0,0.4)" },
            ]}
          >
            <BlurView
              intensity={80}
              tint="dark"
              blurMethod={blurTargetRef ? "dimezisBlurView" : undefined}
              blurTarget={blurTargetRef}
              style={StyleSheet.absoluteFill}
            />
          </Animated.View>
        </Pressable>

        {glassAvailable ? (
          // La opacidad se anima en el contenido: aplicada al GlassView o a sus padres rompe el efecto
          <Animated.View
            style={[styles.dialogWrapper, { transform: [{ scale }] }]}
            accessibilityViewIsModal
          >
            <GlassView style={styles.dialog} glassEffectStyle="regular">
              <Animated.View style={{ opacity: anim }}>{content}</Animated.View>
            </GlassView>
          </Animated.View>
        ) : (
          <Animated.View
            style={[
              styles.dialogWrapper,
              styles.dialog,
              styles.dialogSolid,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
                opacity: anim,
                transform: [{ scale }],
              },
            ]}
            accessibilityViewIsModal
          >
            {content}
          </Animated.View>
        )}
      </View>
    </Portal>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  dialogWrapper: {
    width: "86%",
    maxWidth: 340,
  },
  dialog: {
    borderRadius: 34,
    padding: 22,
  },
  dialogSolid: {
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 24,
  },
  iconChip: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontFamily: "Archivo-Bold",
    fontSize: 19,
    lineHeight: 24,
    letterSpacing: -0.2,
    marginBottom: 6,
  },
  message: {
    fontFamily: "Archivo-Regular",
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 22,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  button: {
    flex: 1,
    height: 50,
    borderRadius: 25,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  buttonText: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 15,
  },
});
