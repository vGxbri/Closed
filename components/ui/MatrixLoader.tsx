import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "react-native-paper";
import Animated, {
  cancelAnimation,
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

interface MatrixLoaderProps {
  color?: string;
  size?: number;
  durationMs?: number;
}

const Bar = ({
  index,
  progress,
  height,
  barWidth,
  blockHeight,
  activeColor,
}: {
  index: number;
  progress: SharedValue<number>;
  height: number;
  barWidth: number;
  blockHeight: number;
  activeColor: string;
}) => {
  const animatedStyle = useAnimatedStyle(() => {
    const phase = index * 0.2;
    const p = (progress.value + phase) % 1;
    const gapMultiplier = 1.5;
    const travelDistance = (height + blockHeight) * gapMultiplier;
    const translateY = -blockHeight + p * travelDistance;

    return {
      transform: [{ translateY }],
    };
  });

  return (
    <View style={[styles.column, { width: barWidth }]}>
      <Animated.View
        style={[
          styles.block,
          { height: blockHeight, backgroundColor: activeColor },
          animatedStyle,
        ]}
      />
    </View>
  );
};

const MatrixLoader: React.FC<MatrixLoaderProps> = ({
  color,
  size = 45,
  durationMs = 700,
}) => {
  const theme = useTheme();
  const activeColor = color || theme.colors.onBackground;

  const width = size;
  const height = size * (40 / 45);
  const barWidth = size * (10 / 45);
  const blockHeight = height * 0.6;

  const progress = useSharedValue(0);

  useEffect(() => {
    // ESTO ES LO IMPORTANTE:
    // Primero matamos cualquier animación que estuviera corriendo
    cancelAnimation(progress);

    // Reseteamos el valor
    progress.value = 0;

    // Arrancamos la nueva con el nuevo tiempo
    progress.value = withRepeat(
      withTiming(1, {
        duration: durationMs,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
  }, [durationMs]); // Solo dependemos de durationMs para reiniciar

  return (
    <View style={[styles.container, { width, height }]}>
      {[0, 1, 2].map((index) => (
        <Bar
          key={index}
          index={index}
          progress={progress}
          height={height}
          barWidth={barWidth}
          blockHeight={blockHeight}
          activeColor={activeColor}
        />
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "transparent",
    overflow: "hidden",
  },
  column: {
    height: "100%",
    overflow: "hidden",
  },
  block: {
    width: "100%",
    borderRadius: 2,
  },
});

export default MatrixLoader;
