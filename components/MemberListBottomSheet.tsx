import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useRef } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import Animated, { useSharedValue } from "react-native-reanimated";
import SquircleView from "react-native-fast-squircle";
import { MemberAvatar } from "./MemberAvatar";
import { GroupMemberView } from "../types/database";
import { BottomSheetModal } from "./ui/BottomSheetModal";

// ─── Role badge helper ──────────────────────────────────────────────────
const getRoleConfig = (role: string) => {
  switch (role) {
    case "owner":
      return { label: "Propietario", icon: "shield" as const };
    case "admin":
      return { label: "Admin", icon: "shield-half" as const };
    default:
      return { label: "Miembro", icon: "person" as const };
  }
};

// ─── Member Row ─────────────────────────────────────────────────────────
interface MemberRowProps {
  member: GroupMemberView;
  isLast: boolean;
  index: number;
}

const MemberRow = React.memo<MemberRowProps>(({ member, isLast, index }) => {
  const theme = useTheme();
  const roleConfig = getRoleConfig(member.role);
  const isSpecialRole = member.role === "owner" || member.role === "admin";

  return (
    <Animated.View
      style={[
        styles.memberRow,
        !isLast && {
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.outlineVariant,
        },
      ]}
    >
      <MemberAvatar user={member} size="md" />
      <View style={styles.memberInfo}>
        <Text
          style={[
            styles.memberName,
            { color: theme.colors.onSurface },
          ]}
          numberOfLines={1}
        >
          {member.display_name}
        </Text>
        <View style={styles.roleRow}>
          <Ionicons
            name={roleConfig.icon}
            size={12}
            color={
              isSpecialRole
                ? theme.colors.primary
                : theme.colors.onSurfaceVariant
            }
          />
          <Text
            style={[
              styles.roleText,
              {
                color: isSpecialRole
                  ? theme.colors.primary
                  : theme.colors.onSurfaceVariant,
              },
            ]}
          >
            {roleConfig.label}
          </Text>
        </View>
      </View>
    </Animated.View>
  );
});

MemberRow.displayName = "MemberRow";

// ─── Main Component ─────────────────────────────────────────────────────
interface MemberListBottomSheetProps {
  visible: boolean;
  onDismiss: () => void;
  members: GroupMemberView[];
  title?: string;
}

export const MemberListBottomSheet: React.FC<MemberListBottomSheetProps> = ({
  visible,
  onDismiss,
  members,
  title = "Participantes",
}) => {
  const theme = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const isScrolledToTop = useSharedValue(true);

  // Sort members: owners first, then admins, then members
  const sortedMembers = React.useMemo(() => {
    const roleOrder = { owner: 0, admin: 1, member: 2 };
    return [...members].sort(
      (a, b) => (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3)
    );
  }, [members]);

  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      isScrolledToTop.value = event.nativeEvent.contentOffset.y <= 0;
    },
    [isScrolledToTop]
  );

  return (
    <BottomSheetModal
      visible={visible}
      onDismiss={onDismiss}
      isScrolledToTop={isScrolledToTop}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <SquircleView
            style={[
              styles.headerIconContainer,
              {
                backgroundColor: theme.dark
                  ? "rgba(42,138,112,0.15)"
                  : "rgba(42,138,112,0.08)",
                borderColor: theme.colors.primary,
                borderWidth: 1,
              },
            ]}
            cornerSmoothing={1}
          >
            <Ionicons
              name="people"
              size={18}
              color={theme.colors.primary}
            />
          </SquircleView>
          <View>
            <Text
              style={[
                styles.headerTitle,
                { color: theme.colors.onSurface },
              ]}
            >
              {title}
            </Text>
            <Text
              style={[
                styles.headerSubtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {members.length}{" "}
              {members.length === 1 ? "persona" : "personas"}
            </Text>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View
        style={[
          styles.divider,
          { backgroundColor: theme.colors.outlineVariant },
        ]}
      />

      {/* Members List */}
      <ScrollView
        ref={scrollRef}
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={true}
      >
        {sortedMembers.map((member, index) => (
          <MemberRow
            key={member.user_id}
            member={member}
            isLast={index === sortedMembers.length - 1}
            index={index}
          />
        ))}
      </ScrollView>
    </BottomSheetModal>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontFamily: "Archivo-Bold",
    fontSize: 18,
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontFamily: "Archivo-Medium",
    fontSize: 13,
    marginTop: 1,
  },

  // Divider
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 20,
  },

  // List
  listContainer: {
    flexShrink: 1,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 34,
  },

  // Member Row
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  memberInfo: {
    flex: 1,
    marginLeft: 14,
  },
  memberName: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 15,
    letterSpacing: 0.1,
  },
  roleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  roleText: {
    fontFamily: "Archivo-Medium",
    fontSize: 12,
    letterSpacing: 0.2,
  },
});
