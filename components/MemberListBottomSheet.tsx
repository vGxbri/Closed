/**
 * Lista de miembros
 * Bottom sheet con el roster del grupo, roles y avatares.
 */

import React, { useCallback, useRef } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useSharedValue } from "react-native-reanimated";
import { getMemberDisplayName } from "../lib/memberProfile";
import { GroupMemberView } from "../types/database";
import { MemberAvatar } from "./MemberAvatar";
import { BottomSheetModal } from "./ui/BottomSheetModal";

// Solo los roles con permisos llevan etiqueta; "miembro" es lo normal y no hace falta decirlo
const ROLE_LABELS: Record<string, string> = {
  owner: "Propietario",
  admin: "Admin",
};

interface MemberRowProps {
  member: GroupMemberView;
  isLast: boolean;
}

const MemberRow = React.memo<MemberRowProps>(({ member, isLast }) => {
  const theme = useTheme();
  const name = getMemberDisplayName(member);
  const roleLabel = ROLE_LABELS[member.role];

  return (
    <View
      accessible
      accessibilityLabel={roleLabel ? `${name}, ${roleLabel}` : name}
      style={styles.memberRow}
    >
      <MemberAvatar user={member} size="md" />
      <View
        style={[
          styles.memberContent,
          !isLast && {
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.colors.outlineVariant,
          },
        ]}
      >
        <Text
          style={[styles.memberName, { color: theme.colors.onSurface }]}
          numberOfLines={1}
        >
          {name}
        </Text>
        {roleLabel && (
          <Text
            style={[styles.roleText, { color: theme.colors.onSurfaceVariant }]}
          >
            {roleLabel}
          </Text>
        )}
      </View>
    </View>
  );
});

MemberRow.displayName = "MemberRow";

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

  // Orden: propietario → admin → miembro
  const sortedMembers = React.useMemo(() => {
    const roleOrder = { owner: 0, admin: 1, member: 2 };
    return [...members].sort(
      (a, b) => (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3),
    );
  }, [members]);

  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      isScrolledToTop.value = event.nativeEvent.contentOffset.y <= 0;
    },
    [isScrolledToTop],
  );

  return (
    <BottomSheetModal
      visible={visible}
      onDismiss={onDismiss}
      isScrolledToTop={isScrolledToTop}
    >
      <View style={styles.header}>
        <Text
          accessibilityRole="header"
          style={[styles.headerTitle, { color: theme.colors.onSurface }]}
        >
          {title}
        </Text>
        <Text
          style={[
            styles.headerSubtitle,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          {members.length} {members.length === 1 ? "persona" : "personas"}
        </Text>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={true}
      >
        <View
          style={[
            styles.group,
            {
              backgroundColor: theme.dark
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.05)",
            },
          ]}
        >
          {sortedMembers.map((member, index) => (
            <MemberRow
              key={member.user_id}
              member={member}
              isLast={index === sortedMembers.length - 1}
            />
          ))}
        </View>
      </ScrollView>
    </BottomSheetModal>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 22,
    paddingTop: 4,
    paddingBottom: 12,
  },
  headerTitle: {
    fontFamily: "Archivo-Bold",
    fontSize: 20,
    lineHeight: 25,
  },
  headerSubtitle: {
    fontFamily: "Archivo-Medium",
    fontSize: 13,
    marginTop: 2,
  },

  listContainer: {
    flexShrink: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 34,
  },
  group: {
    borderRadius: 22,
    overflow: "hidden",
    paddingLeft: 14,
  },

  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  // El separador nace tras el avatar, como en las listas de iOS
  memberContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    minHeight: 66,
    paddingRight: 16,
  },
  memberName: {
    flexShrink: 1,
    fontFamily: "Archivo-SemiBold",
    fontSize: 16,
  },
  roleText: {
    fontFamily: "Archivo-Medium",
    fontSize: 14,
  },
});
