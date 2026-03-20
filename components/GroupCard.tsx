import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Card, Surface, Text, useTheme } from "react-native-paper";
import {
  defaultGroupIcon,
  getIconComponent,
  IconName,
} from "../constants/icons";
import { theme as appTheme } from "../constants/theme";
import { GroupWithDetails } from "../types/database";

interface GroupCardProps {
  group: GroupWithDetails;
  onPress: () => void;
}

export const GroupCard: React.FC<GroupCardProps> = ({ group, onPress }) => {
  const theme = useTheme();
  const awardCount = group.awards?.length || 0;
  const iconName = (group.icon as IconName) || defaultGroupIcon;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card
        mode="elevated"
        style={[
          styles.card,
          { borderColor: theme.colors.secondaryContainer, borderWidth: 1 },
        ]}
      >
        <Card.Content style={styles.row}>
          <Surface
            style={[
              styles.iconContainer,
              {
                backgroundColor: theme.colors.primaryContainer,
                borderColor: theme.colors.primary,
                borderWidth: 1,
              },
            ]}
            elevation={0}
          >
            {getIconComponent(iconName, 24, theme.colors.onSurface)}
          </Surface>

          <View style={styles.content}>
            <Text variant="titleMedium" style={{ fontWeight: "600" }}>
              {group.name}
            </Text>
            <View style={styles.metaRow}>
              <Ionicons
                name="people"
                size={14}
                color={theme.colors.onSurface}
              />
              <Text
                variant="labelMedium"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {group.member_count} miembros
              </Text>
              {awardCount > 0 && (
                <>
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: theme.colors.outline },
                    ]}
                  />
                  <Ionicons
                    name="trophy"
                    size={14}
                    color={theme.colors.onSurface}
                  />
                  <Text
                    variant="labelMedium"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {awardCount} premios
                  </Text>
                </>
              )}
            </View>
          </View>

          <Ionicons
            name="chevron-forward"
            size={20}
            color={theme.colors.onSurfaceVariant}
          />
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: appTheme.spacing.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: appTheme.borderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: appTheme.spacing.md,
  },
  content: {
    flex: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 6,
  },
});
