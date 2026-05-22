import { Ionicons } from "@expo/vector-icons";
import React, { useCallback } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Text, useTheme } from "react-native-paper";

import { GroupMemberView } from "../../types/database";
import { UserAvatar } from "./UserAvatar";

interface MemberChecklistProps {
  members: GroupMemberView[];
  selectedIds: Set<string>;
  onToggle: (userId: string) => void;
}

export const MemberChecklist = React.memo<MemberChecklistProps>(
  ({ members, selectedIds, onToggle }) => {
    const theme = useTheme();

    return (
      <View style={styles.container}>
        {members.map((member) => {
          const isSelected = selectedIds.has(member.user_id);
          return (
            <MemberChecklistItem
              key={member.user_id}
              member={member}
              isSelected={isSelected}
              onToggle={onToggle}
            />
          );
        })}
      </View>
    );
  }
);

MemberChecklist.displayName = "MemberChecklist";

interface MemberChecklistItemProps {
  member: GroupMemberView;
  isSelected: boolean;
  onToggle: (userId: string) => void;
}

const MemberChecklistItem = React.memo<MemberChecklistItemProps>(
  ({ member, isSelected, onToggle }) => {
    const theme = useTheme();

    const handlePress = useCallback(() => {
      onToggle(member.user_id);
    }, [member.user_id, onToggle]);

    return (
      <Pressable
        onPress={handlePress}
        style={({ pressed }) => [
          styles.itemContainer,
          { opacity: pressed ? 0.85 : 1 },
        ]}
      >
        <SquircleView
          style={[
            styles.item,
            {
              backgroundColor: isSelected
                ? theme.colors.primaryContainer
                : theme.colors.surface,
              borderColor: isSelected
                ? theme.colors.primary
                : theme.colors.outlineVariant,
              borderWidth: isSelected ? 1.5 : 1,
            },
          ]}
          cornerSmoothing={1}
        >
          <SquircleView
            style={[
              styles.checkbox,
              {
                backgroundColor: isSelected ? theme.colors.primary : "transparent",
                borderColor: isSelected
                  ? theme.colors.primary
                  : theme.colors.outline,
                borderWidth: isSelected ? 0 : 2,
              },
            ]}
            cornerSmoothing={1}
          >
            {isSelected && (
              <Ionicons name="checkmark" size={14} color="#FFFFFF" />
            )}
          </SquircleView>

          <UserAvatar
            uri={member.avatar_url}
            name={member.group_display_name || member.display_name}
            size="sm"
          />

          <Text
            style={[styles.name, { color: theme.colors.onSurface }]}
            numberOfLines={1}
          >
            {member.group_display_name || member.display_name}
          </Text>
        </SquircleView>
      </Pressable>
    );
  }
);

MemberChecklistItem.displayName = "MemberChecklistItem";

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  itemContainer: {},
  item: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  name: {
    fontSize: 15,
    fontWeight: "500",
    flex: 1,
  },
});
