import { BlurView } from "expo-blur";
import React, { useCallback, useEffect, useState } from "react";
import {
  Dimensions,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Portal, useTheme } from "react-native-paper";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  SharedValue,
} from "react-native-reanimated";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");
const DISMISS_THRESHOLD = 120;

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
  const [shouldRender, setShouldRender] = useState(false);

  // Animated values
  const translateY = useSharedValue(SCREEN_HEIGHT);
  const backdropOpacity = useSharedValue(0);
  const context = useSharedValue(0);

  const dismiss = useCallback(() => {
    "worklet";
    translateY.value = withTiming(SCREEN_HEIGHT, { duration: 300 });
    backdropOpacity.value = withTiming(0, { duration: 250 });
    runOnJS(onDismiss)();
  }, [onDismiss, translateY, backdropOpacity]);

  // Open / close animation
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

  // Pan gesture for dragging down
  const panGesture = Gesture.Pan()
    .onStart(() => {
      context.value = translateY.value;
    })
    .onUpdate((event) => {
      // Only allow downward drag when scrolled to top (or always if no scroll value provided)
      const isAtTop = isScrolledToTop ? isScrolledToTop.value : true;
      if (isAtTop || event.translationY > 0) {
        translateY.value = Math.max(0, context.value + event.translationY);
        // Fade backdrop proportionally
        const progress = Math.max(
          0,
          1 - translateY.value / SCREEN_HEIGHT
        );
        backdropOpacity.value = progress;
      }
    })
    .onEnd((event) => {
      if (
        translateY.value > DISMISS_THRESHOLD ||
        event.velocityY > 800
      ) {
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

  // Animated styles
  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));

  if (!shouldRender) return null;

  return (
    <Portal>
      <View style={styles.container}>
        {/* Backdrop */}
        <Pressable style={styles.backdrop} onPress={onDismiss}>
          <Animated.View style={[StyleSheet.absoluteFill, backdropStyle]}>
            <BlurView
              intensity={25}
              tint="dark"
              style={StyleSheet.absoluteFill}
              blurMethod={blurTarget ? "dimezisBlurView" : undefined}
              blurTarget={blurTarget}
            />
          </Animated.View>
        </Pressable>

        {/* Bottom Sheet */}
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.sheetContainer,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
                maxHeight: maxHeight as any,
              },
              sheetStyle,
              contentStyle,
            ]}
          >
            {/* Handle bar — drag target */}
            <View style={styles.handleArea}>
              <View
                style={[
                  styles.handleBar,
                  {
                    backgroundColor: theme.dark
                      ? "rgba(255,255,255,0.2)"
                      : "rgba(0,0,0,0.15)",
                  },
                ]}
              />
            </View>

            {children}
          </Animated.View>
        </GestureDetector>
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
  sheetContainer: {
    width: "100%",
    maxWidth: 500,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 24,
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
