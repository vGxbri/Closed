/**
 * Iconografía de la aplicación
 * Mapeo de iconos Expo Vector para categorías y navegación de Closed.
 */

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { View } from "react-native";

export type IconName = 
  | "trophy" 
  | "people" 
  | "home" 
  | "briefcase" 
  | "gamepad" 
  | "football" 
  | "music" 
  | "book" 
  | "airplane" 
  | "heart"
  | "star"
  | "fire"
  | "diamond"
  | "target"
  | "celebration"
  | "medal"
  | "crown"
  | "ribbon";

export const groupIconOptions: IconName[] = [
  "trophy",
  "people", 
  "home",
  "briefcase",
  "gamepad",
  "football",
  "music",
  "book",
  "star",
  "heart",
];

export const awardIconOptions: IconName[] = [
  "trophy",
  "star",
  "medal",
  "crown",
  "diamond",
  "ribbon",
  "fire",
  "target",
];

export const getIconComponent = (iconName: IconName, size: number = 24, color: string = "#000") => {
  const iconMap: Record<IconName, { library: "ionicons" | "material"; name: string }> = {
    trophy: { library: "ionicons", name: "trophy" },
    people: { library: "ionicons", name: "people" },
    home: { library: "ionicons", name: "home" },
    briefcase: { library: "ionicons", name: "briefcase" },
    gamepad: { library: "ionicons", name: "game-controller" },
    football: { library: "ionicons", name: "football" },
    music: { library: "ionicons", name: "musical-notes" },
    book: { library: "ionicons", name: "book" },
    airplane: { library: "ionicons", name: "airplane" },
    heart: { library: "ionicons", name: "heart" },
    star: { library: "ionicons", name: "star" },
    fire: { library: "ionicons", name: "flame" },
    diamond: { library: "ionicons", name: "diamond" },
    target: { library: "material", name: "target" },
    celebration: { library: "material", name: "party-popper" },
    medal: { library: "ionicons", name: "medal" },
    crown: { library: "material", name: "crown" },
    ribbon: { library: "ionicons", name: "ribbon" },
  };

  const icon = iconMap[iconName] || iconMap.trophy;

  if (icon.library === "material") {
    return <MaterialCommunityIcons name={icon.name as any} size={size} color={color} />;
  }
  return <Ionicons name={icon.name as any} size={size} color={color} />;
};

export const getOutlinedIconComponent = (
  iconName: IconName, 
  size: number = 24, 
  fillColor: string = "#000",
  strokeColor: string = "#2A8A70",
  strokeWidth: number = 2
) => {
  return (
    <View style={{ position: 'relative', width: size, height: size }}>
      <View style={{ position: 'absolute', top: -strokeWidth/2, left: 0 }}>
        {getIconComponent(iconName, size, strokeColor)}
      </View>
      <View style={{ position: 'absolute', top: strokeWidth/2, left: 0 }}>
        {getIconComponent(iconName, size, strokeColor)}
      </View>
      <View style={{ position: 'absolute', top: 0, left: -strokeWidth/2 }}>
        {getIconComponent(iconName, size, strokeColor)}
      </View>
      <View style={{ position: 'absolute', top: 0, left: strokeWidth/2 }}>
        {getIconComponent(iconName, size, strokeColor)}
      </View>
      <View style={{ position: 'absolute', top: 0, left: 0 }}>
        {getIconComponent(iconName, size, fillColor)}
      </View>
    </View>
  );
};

export const defaultGroupIcon: IconName = "trophy";
export const defaultAwardIcon: IconName = "trophy";
