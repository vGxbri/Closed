import { impactAsync, ImpactFeedbackStyle } from "expo-haptics";
import { Image as ExpoImage } from "expo-image";
import React, { memo, useCallback } from "react";
import { Dimensions, StyleSheet, View } from "react-native";
import Animated, {
    Extrapolation,
    interpolate,
    runOnJS,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
} from "react-native-reanimated";
import type {
    ParallaxCarouselItem,
    ParallaxCarouselItemProps,
    ParallaxCarouselProps,
} from "./types";

const { width, height } = Dimensions.get("window");

const triggerHaptic = () => {
  impactAsync(ImpactFeedbackStyle.Rigid);
};

// Animated wrapper for ExpoImage
const AnimatedExpoImage = Animated.createAnimatedComponent(ExpoImage);

const ParallaxCarouselItemComponent = <ItemT extends ParallaxCarouselItem>({
  item,
  index,
  scrollX,
  renderItem,
  itemWidth,
  itemHeight,
  spacing,
  parallaxIntensity,
}: ParallaxCarouselItemProps<ItemT>) => {
  // Use a wider input range for smoother interpolation (2:1 ratio to reduce jitter)
  const inputRange = [
    (index - 1) * itemWidth,
    index * itemWidth,
    (index + 1) * itemWidth,
  ];

  // Reduced output values to create better ratio and smoother movement
  const parallaxOffset = itemWidth * parallaxIntensity * 0.5;

  const imageAnimatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      scrollX.value,
      inputRange,
      [-parallaxOffset, 0, parallaxOffset],
      Extrapolation.CLAMP,
    );

    return {
      transform: [{ translateX }],
    };
  });

  const containerWidth = itemWidth - spacing * 2;
  const containerHeight = itemHeight - spacing * 2;

  return (
    <View
      style={[styles.itemContainer, { width: itemWidth, height: itemHeight }]}
    >
      <View
        style={[
          styles.imageContainer,
          { width: containerWidth, height: containerHeight },
        ]}
      >
        {item.image && (
          <AnimatedExpoImage
            source={item.image}
            style={[
              {
                width: containerWidth * 1.4,
                height: containerHeight,
              },
              imageAnimatedStyle,
            ]}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        )}
      </View>
      {renderItem({ item, index })}
    </View>
  );
};

const MemoizedParallaxCarouselItemComponent = memo(
  ParallaxCarouselItemComponent,
) as typeof ParallaxCarouselItemComponent;

const ParallaxCarousel = <ItemT extends ParallaxCarouselItem>({
  data,
  renderItem,
  keyExtractor,
  itemWidth = width,
  itemHeight = height * 0.75,
  spacing = 20,
  parallaxIntensity = 0.7,
  pagingEnabled = true,
  showHorizontalScrollIndicator = false,
}: ParallaxCarouselProps<ItemT>) => {
  const scrollX = useSharedValue(0);

  const onScroll = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
    onEndDrag: () => {
      runOnJS(triggerHaptic)();
    },
  });

  const defaultKeyExtractor = useCallback(
    (item: ItemT, index: number) =>
      keyExtractor ? keyExtractor(item, index) : `item-${index}`,
    [keyExtractor],
  );

  const stableRenderItem = useCallback(
    ({ item, index }: { item: ItemT; index: number }) => (
      <MemoizedParallaxCarouselItemComponent
        item={item}
        index={index}
        scrollX={scrollX}
        renderItem={renderItem}
        itemWidth={itemWidth}
        itemHeight={itemHeight}
        spacing={spacing}
        parallaxIntensity={parallaxIntensity}
      />
    ),
    [scrollX, renderItem, itemWidth, itemHeight, spacing, parallaxIntensity],
  );

  return (
    <View style={styles.carouselWrapper}>
      <Animated.FlatList
        data={data}
        keyExtractor={defaultKeyExtractor}
        horizontal
        pagingEnabled={pagingEnabled}
        showsHorizontalScrollIndicator={showHorizontalScrollIndicator}
        onScroll={onScroll}
        style={styles.flatList}
        scrollEventThrottle={16}
        decelerationRate="fast"
        contentContainerStyle={styles.flatListContent}
        renderItem={stableRenderItem}
        removeClippedSubviews={true}
        maxToRenderPerBatch={3}
        windowSize={3}
        initialNumToRender={2}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  carouselWrapper: {
    // Removed flex: 1 and justifyContent: "center" to allow parent positioning
    alignItems: "center",
    width: "100%",
  },
  flatList: {
    flexGrow: 0,
  },
  flatListContent: {
    alignItems: "center",
  },
  itemContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  imageContainer: {
    overflow: "hidden",
    borderRadius: 20,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
});

export {
    ParallaxCarousel,
    ParallaxCarouselItem,
    ParallaxCarouselItemProps,
    ParallaxCarouselProps
};

