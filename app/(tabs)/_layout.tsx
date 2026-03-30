import { Ionicons } from "@expo/vector-icons";
import { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Tabs } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";
import SquircleView from "react-native-fast-squircle";
import { useTheme } from "react-native-paper";
import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type AnimatedIconProps = {
  focused: boolean;
  iconName: any;
  color: string;
  theme: any;
};

function AnimatedTabIcon({
  focused,
  iconName,
  color,
  theme,
}: AnimatedIconProps) {
  const animatedBgStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(focused ? 1 : 0, { duration: 100 }),
      transform: [{ scaleX: withTiming(focused ? 1 : 0.4, { duration: 100 }) }],
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      borderRadius: 100,
      backgroundColor: `${theme.colors.primaryContainer}`,
      borderWidth: 1,
      borderColor: `${theme.colors.primary}90`,
    };
  }, [focused, theme]);

  return (
    <View
      style={{
        alignItems: "center",
        justifyContent: "center",
        // Hacemos el contenedor más grande (padding) para que el fondo se expanda más
        paddingHorizontal: 28,
        paddingVertical: 10,
      }}
    >
      <Animated.View style={animatedBgStyle} collapsable={false} />
      <Ionicons name={iconName} size={24} color={color} />
    </View>
  );
}

function FloatingTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const bottomMargin = insets.bottom > 0 ? insets.bottom + 12 : 36;
  const gradientHeight = bottomMargin + 64 + 60; // Tab bar height is 64, plus some padding above

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <View
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: gradientHeight,
        }}
        pointerEvents="none"
      >
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={theme.colors.background} stopOpacity="0" />
              <Stop offset="0.4" stopColor={theme.colors.background} stopOpacity="0.7" />
              <Stop offset="1" stopColor={theme.colors.background} stopOpacity="1" />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#grad)" />
        </Svg>
      </View>

      <SquircleView
        style={[
          styles.tabBarContainer,
          {
            bottom: bottomMargin,
            backgroundColor: theme.colors.surface,
          },
        ]}
        cornerSmoothing={1}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];

          // Skip tabs without an icon (hidden tabs like index)
          if (!options.tabBarIcon) return null;

          const isFocused = state.index === index;
          const color = theme.colors.onSurface;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: "tabLongPress",
              target: route.key,
            });
          };

          // Render icon from options
          const icon = options.tabBarIcon?.({
            focused: isFocused,
            color,
            size: 24,
          });

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabItem}
            >
              {icon}
            </Pressable>
          );
        })}
      </SquircleView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: "absolute",
    flexDirection: "row",
    marginHorizontal: 16,
    left: 0,
    right: 0,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "space-evenly",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },
});

export default function TabLayout() {
  const theme = useTheme();

  return (
    <Tabs
      tabBar={(props) => <FloatingTabBar {...props} />}
      screenOptions={{
        tabBarShowLabel: false,
        animation: "fade",
        tabBarHideOnKeyboard: true,
        headerStyle: {
          backgroundColor: theme.colors.surface,
          elevation: 0,
          shadowOpacity: 0,
          borderBottomWidth: 1,
          borderBottomColor: theme.colors.outlineVariant,
        },
        headerTintColor: theme.colors.onSurface,
        headerTitleStyle: {
          fontWeight: "700",
          fontSize: 20,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Feed",
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <AnimatedTabIcon
              focused={focused}
              iconName={focused ? "home" : "home-outline"}
              color={color}
              theme={theme}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="groups"
        options={{
          title: "Grupos",
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <AnimatedTabIcon
              focused={focused}
              iconName={focused ? "grid" : "grid-outline"}
              color={color}
              theme={theme}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Perfil",
          headerShown: false,
          tabBarIcon: ({ focused, color }) => (
            <AnimatedTabIcon
              focused={focused}
              iconName={focused ? "person" : "person-outline"}
              color={color}
              theme={theme}
            />
          ),
        }}
      />

      <Tabs.Screen name="index" options={{ href: null }} />
    </Tabs>
  );
}
