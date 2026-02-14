import { customColors, customColorsDark } from "@/constants/Colors";
import React from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ParallaxCarousel } from "../components/premade/molecules/parallax-carousel";

const { height } = Dimensions.get("window");

// Load assets at module level to ensure availability
const LOGO_LIGHT = require("../assets/images/logo_full_light.png");
const LOGO_DARK = require("../assets/images/logo_full_dark.png");

const ITEMS: string[] = [
  "https://i.pinimg.com/736x/bb/6e/1e/bb6e1e3d8b8e6720e0f157e1ee2196e1.jpg",
  "https://i.pinimg.com/736x/a9/74/57/a97457c911867c0d50d5bcedf6316cd4.jpg",
  "https://i.pinimg.com/736x/2d/eb/96/2deb969a74ca7ae7207f0795928ca048.jpg",
  "https://i.pinimg.com/736x/e3/6a/00/e36a009c0b99b0ada7646c09a4a3ff6b.jpg",
];

export default function ChooseGroupScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const insets = useSafeAreaInsets();
  const colors = isDark ? customColorsDark : customColors;

  const backgroundColor = colors.background;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor, paddingBottom: insets.bottom },
      ]}
    >
      {/* 
      <View style={[styles.logoContainer, { top: insets.top + 20 }]}>
        <Image
          source={isDark ? LOGO_LIGHT : LOGO_DARK}
          style={{ width: 140, height: 50 }}
          contentFit="contain"
          transition={200}
        />
      </View>
      */}

      <View
        style={{
          marginBottom: 0,
          paddingHorizontal: 24,
        }}
      >
        <Text
          style={{
            fontFamily: "Archivo-Bold",
            fontSize: 36,
            color: colors.onBackground,
          }}
        >
          Elige tu
        </Text>
        <Text
          style={{
            fontFamily: "InstrumentSerif-Italic",
            fontSize: 42,
            marginTop: -20,
            color: colors.primary,
            letterSpacing: 2,
            borderBottomColor: colors.onBackground,
            borderBottomWidth: 1,
            paddingBottom: 5,
            width: "90%",
          }}
        >
          tipo de grupo
        </Text>
      </View>

      <ParallaxCarousel
        data={ITEMS.map((v) => ({ image: { uri: v } }))}
        renderItem={() => <></>}
        parallaxIntensity={1}
        itemHeight={height * 0.7}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
  },
  logoContainer: {
    position: "absolute",
    left: 24,
    zIndex: 100,
    elevation: 100,
    width: 140,
    height: 50,
  },
  logo: {
    width: "100%",
    height: "100%",
  },
});

const stylez = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
