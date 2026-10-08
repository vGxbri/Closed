/**
 * Bottom sheet modal
 * Panel deslizable desde abajo con blur, gestos y cierre por arrastre.
 * En iOS 26+ es una hoja flotante de Liquid Glass; en el resto, una superficie opaca pegada al borde.
 */

import { BlurView } from "expo-blur";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { Portal, useTheme } from "react-native-paper";
import { FullWindowOverlay } from "react-native-screens";

import { SnackbarContext } from "./SnackbarContext";
import Animated, {
  runOnJS,
  SharedValue,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const DISMISS_THRESHOLD = 120;

const glassAvailable = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

export interface BottomSheetModalProps {
  visible: boolean;
  onDismiss: () => void;
  children: React.ReactNode;
  maxHeight?: number | string;
  isScrolledToTop?: SharedValue<boolean>;
  contentStyle?: ViewStyle;
  blurTarget?: React.RefObject<any>;
}

export const BottomSheetModal: React.FC<BottomSheetModalProps> = ({
  visible,
  onDismiss,
  children,
  maxHeight = SCREEN_HEIGHT * 0.85,
  isScrolledToTop,
  contentStyle,
  blurTarget,
}) => {
  const theme = useTheme();
  const snackbarContext = useContext(SnackbarContext);
  const [shouldRender, setShouldRender] = useState(false);

  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const context = useSharedValue(0);

  const dismiss = useCallback(() => {
    "worklet";
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 300 });
    backdropOpacity.value = withTiming(0, { duration: 250 });
    runOnJS(onDismiss)();
  }, [onDismiss, translateY, backdropOpacity]);

  useEffect(() => {
    if (visible) {
      setShouldRender(true);
      requestAnimationFrame(() => {
        translateY.value = withSpring(0, {
          damping: 22,
          stiffness: 200,
          mass: 0.8,
        });
        backdropOpacity.value = withTiming(1, { duration: 300 });
      });
    } else if (shouldRender) {
      translateY.value = withTiming(SCREEN_HEIGHT, { duration: 300 }, () => {
        runOnJS(setShouldRender)(false);
      });
      backdropOpacity.value = withTiming(0, { duration: 250 });
    }
  }, [visible]); // eslint-disable-line react-hooks/exhaustive-deps

  const panGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .onStart(() => {
      context.value = translateY.value;
    })
    .onUpdate((event) => {
      // Solo arrastrar hacia abajo si el scroll está arriba
      const isAtTop = isScrolledToTop ? isScrolledToTop.value : true;
      if (isAtTop || event.translationY > 0) {
        translateY.value = Math.max(0, context.value + event.translationY);
        const progress = Math.max(0, 1 - translateY.value / SCREEN_HEIGHT);
        backdropOpacity.value = progress;
      }
    })
    .onEnd((event) => {
      if (translateY.value > DISMISS_THRESHOLD || event.velocityY > 800) {
        dismiss();
      } else {
        translateY.value = withSpring(0, {
          damping: 22,
          stiffness: 200,
          mass: 0.8,
        });
        backdropOpacity.value = withTiming(1, { duration: 200 });
      }
    });

  const keyboard = useAnimatedKeyboard();

  const sheetStyle = useAnimatedStyle(() => {
    // El teclado desplaza la hoja solo cuando está abierta
    const progress = 1 - translateY.value / SCREEN_HEIGHT;
    return {
      transform: [
        { translateY: translateY.value },
        { translateY: -keyboard.height.value * progress },
      ],
    };
  });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!shouldRender) return null;

  const content = (
    <>
      <View style={styles.handleArea}>
        <View
          style={[
            styles.handleBar,
            {
              backgroundColor: theme.dark
                ? "rgba(255,255,255,0.25)"
                : "rgba(0,0,0,0.18)",
            },
          ]}
        />
      </View>

      {children}
    </>
  );

  const sheet = (
    <View style={styles.container}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
          <BlurView
            intensity={60}
            tint="dark"
            style={StyleSheet.absoluteFill}
            blurMethod={blurTarget ? "dimezisBlurView" : undefined}
            blurTarget={blurTarget}
          />
        </Animated.View>
      </Pressable>

      <GestureDetector gesture={panGesture}>
        {/* Solo se anima la posición: una opacidad parcial sobre el cristal estropea el efecto */}
        <Animated.View
          style={[
            styles.sheetWrapper,
            glassAvailable && styles.sheetWrapperFloating,
            { maxHeight: maxHeight as any },
            sheetStyle,
          ]}
        >
          {glassAvailable ? (
            <GlassView
              style={[styles.sheet, styles.sheetFloating]}
              glassEffectStyle="regular"
            >
              {/* Recorta el contenido desplazable a las esquinas de la hoja */}
              <View
                style={[
                  styles.sheet,
                  styles.sheetFloating,
                  styles.sheetClip,
                  contentStyle,
                ]}
              >
                {content}
              </View>
            </GlassView>
          ) : (
            <View
              style={[
                styles.sheet,
                styles.sheetAttached,
                styles.sheetClip,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant,
                },
                contentStyle,
              ]}
            >
              {content}
            </View>
          )}
        </Animated.View>
      </GestureDetector>
    </View>
  );

  // En iOS la hoja se pinta sobre toda la ventana: el Portal queda por debajo de las pantallas
  // modales nativas. Fuera del árbol principal los gestos necesitan su propia raíz.
  if (Platform.OS === "ios") {
    return (
      <FullWindowOverlay>
        <GestureHandlerRootView style={StyleSheet.absoluteFill}>
          {sheet}
        </GestureHandlerRootView>
      </FullWindowOverlay>
    );
  }

  return (
    <Portal>
      {snackbarContext ? (
        <SnackbarContext.Provider value={snackbarContext}>
          {sheet}
        </SnackbarContext.Provider>
      ) : (
        sheet
      )}
    </Portal>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    justifyContent: "flex-end",
    alignItems: "center",
    zIndex: 1000,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
  },
  sheetWrapper: {
    width: "100%",
    maxWidth: 500,
  },
  // La hoja de cristal flota separada de los bordes, como las hojas de iOS 26
  sheetWrapperFloating: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  sheet: {
    flexShrink: 1,
  },
  sheetFloating: {
    borderRadius: 40,
  },
  sheetAttached: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 24,
  },
  sheetClip: {
    overflow: "hidden",
  },
  handleArea: {
    paddingTop: 12,
    paddingBottom: 8,
    alignItems: "center",
  },
  handleBar: {
    width: 40,
    height: 5,
    borderRadius: 3,
  },
});
