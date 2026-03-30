import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import {
  Dimensions,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Text, useTheme } from "react-native-paper";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  defaultGroupIcon,
  getIconComponent,
  IconName,
} from "../../../constants/icons";
import { useGroups } from "../../../hooks";
import { GroupWithDetails } from "../../../types/database";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_GAP = 14;
const CARD_WIDTH = (SCREEN_WIDTH - 24 * 2 - CARD_GAP) / 2;

// ─── Skeleton Placeholder ───────────────────────────────────────────────
interface SkeletonCardProps {
  index: number;
}

const SkeletonCard = React.memo<SkeletonCardProps>(({ index }) => {
  const theme = useTheme();
  return (
    <Animated.View
      entering={FadeIn.duration(400).delay(index * 80)}
      style={styles.bentoItem}
    >
      <SquircleView
        style={[
          styles.groupCard,
          {
            backgroundColor: theme.colors.surfaceVariant,
            borderColor: theme.colors.outlineVariant,
            borderWidth: 1,
          },
        ]}
        cornerSmoothing={1}
      >
        {/* Icon placeholder */}
        <View
          style={[
            styles.skeletonIcon,
            { backgroundColor: theme.dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" },
          ]}
        />
        {/* Text placeholder */}
        <View
          style={[
            styles.skeletonTextLong,
            { backgroundColor: theme.dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)" },
          ]}
        />
        <View
          style={[
            styles.skeletonTextShort,
            { backgroundColor: theme.dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" },
          ]}
        />
      </SquircleView>
    </Animated.View>
  );
});

SkeletonCard.displayName = "SkeletonCard";

// ─── Group Card ─────────────────────────────────────────────────────────
interface GroupCardItemProps {
  group: GroupWithDetails;
  index: number;
  onPress: () => void;
}

const GroupCardItem = React.memo<GroupCardItemProps>(
  ({ group, index, onPress }) => {
    const theme = useTheme();
    const iconName = (group.icon as IconName) || defaultGroupIcon;
    const awardCount = group.awards?.length || 0;

    return (
      <Animated.View
        entering={FadeInDown.duration(400).delay(100 + index * 80)}
        style={styles.bentoItem}
      >
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            {
              opacity: pressed ? 0.92 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
        >
          <SquircleView
            style={[
              styles.groupCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
                borderWidth: 1,
              },
            ]}
            cornerSmoothing={1}
          >
            {/* Icon */}
            <SquircleView
              style={[
                styles.groupIconContainer,
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
              {getIconComponent(iconName, 22, theme.colors.primary)}
            </SquircleView>

            {/* Group Info */}
            <View style={styles.groupInfo}>
              <Text
                style={[styles.groupName, { color: theme.colors.onSurface }]}
                numberOfLines={2}
              >
                {group.name}
              </Text>

              <View style={styles.groupMeta}>
                <View style={styles.metaChip}>
                  <Ionicons
                    name="people"
                    size={12}
                    color={theme.colors.onSurfaceVariant}
                  />
                  <Text
                    style={[
                      styles.metaText,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {group.member_count}
                  </Text>
                </View>
                {awardCount > 0 && (
                  <View style={styles.metaChip}>
                    <Ionicons
                      name="trophy"
                      size={12}
                      color={theme.colors.onSurfaceVariant}
                    />
                    <Text
                      style={[
                        styles.metaText,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      {awardCount}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Role Badge */}
            {group.my_role && group.my_role !== "member" && (
              <View
                style={[
                  styles.roleBadge,
                  {
                    backgroundColor: theme.dark
                      ? "rgba(42,138,112,0.2)"
                      : "rgba(42,138,112,0.1)",
                  },
                ]}
              >
                <Text
                  style={[styles.roleBadgeText, { color: theme.colors.primary }]}
                >
                  {group.my_role === "owner" ? "Admin" : "Mod"}
                </Text>
              </View>
            )}
          </SquircleView>
        </Pressable>
      </Animated.View>
    );
  }
);

GroupCardItem.displayName = "GroupCardItem";

// ─── Main Screen ────────────────────────────────────────────────────────
export default function GroupsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { groups, isLoading, refetch } = useGroups();
  const hasRedirected = useRef(false);

  // Auto-redirect: if user has exactly 1 group, go straight into it to skip the selection screen
  useEffect(() => {
    if (!isLoading && groups.length === 1 && !hasRedirected.current) {
      hasRedirected.current = true;
      router.replace({
        pathname: "/groups/group/[id]",
        params: { id: groups[0].id },
      } as any);
    }
  }, [isLoading, groups, router]);

  const handleGroupPress = useCallback(
    (groupId: string) => {
      router.push({ pathname: "/groups/group/[id]", params: { id: groupId } });
    },
    [router]
  );

  const handleCreateGroup = useCallback(
    () => router.push("/groups/group/create" as any),
    [router]
  );

  const handleJoinGroup = useCallback(
    () => router.push("/groups/group/join" as any),
    [router]
  );

  // Memoize skeleton cards
  const skeletonCards = useMemo(
    () =>
      Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCard key={`skeleton-${i}`} index={i} />
      )),
    []
  );

  // If only 1 group, don't render the screen (auto-redirect handles it)
  if (!isLoading && groups.length === 1) {
    return null;
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={isLoading && groups.length > 0}
              onRefresh={refetch}
              tintColor={theme.colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          bounces={true}
        >
          {/* ─── Header ─── */}
          <Animated.View
            entering={FadeInUp.duration(500)}
            style={styles.header}
          >
            <View>
              <Text
                style={[styles.title, { color: theme.colors.primary }]}
              >
                Tus Grupos
              </Text>
              <Text
                style={[
                  styles.subtitle,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {isLoading
                  ? "Cargando..."
                  : `${groups.length} grupo${groups.length !== 1 ? "s" : ""}`}
              </Text>
            </View>

            {/* Action buttons */}
            <View style={styles.headerActions}>
              <Pressable
                onPress={handleJoinGroup}
                style={({ pressed }) => [
                  {
                    opacity: pressed ? 0.7 : 1,
                    transform: [{ scale: pressed ? 0.92 : 1 }],
                  },
                ]}
              >
                <SquircleView
                  style={[
                    styles.headerButton,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.outlineVariant,
                      borderWidth: 1,
                    },
                  ]}
                  cornerSmoothing={1}
                >
                  <Ionicons
                    name="qr-code-outline"
                    size={20}
                    color={theme.colors.onSurfaceVariant}
                  />
                </SquircleView>
              </Pressable>

              <Pressable
                onPress={handleCreateGroup}
                style={({ pressed }) => [
                  {
                    opacity: pressed ? 0.7 : 1,
                    transform: [{ scale: pressed ? 0.92 : 1 }],
                  },
                ]}
              >
                <SquircleView
                  style={[
                    styles.headerButton,
                    {
                      backgroundColor: theme.colors.primary,
                    },
                  ]}
                  cornerSmoothing={1}
                >
                  <Ionicons name="add" size={22} color={theme.colors.onPrimary} />
                </SquircleView>
              </Pressable>
            </View>
          </Animated.View>

          {/* Divider */}
          <Animated.View
            entering={FadeIn.duration(400).delay(100)}
            style={[
              styles.divider,
              { backgroundColor: theme.colors.outlineVariant },
            ]}
          />

          {/* ─── Content ─── */}
          {isLoading && groups.length === 0 ? (
            // Skeleton Loading
            <View style={styles.bentoGrid}>{skeletonCards}</View>
          ) : groups.length === 0 ? (
            // Empty State
            <Animated.View
              entering={FadeInDown.duration(500).delay(150)}
              style={styles.emptyContainer}
            >
              <SquircleView
                style={[
                  styles.emptyCard,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant,
                    borderWidth: 1,
                  },
                ]}
                cornerSmoothing={1}
              >
                <SquircleView
                  style={[
                    styles.emptyIconContainer,
                    {
                      backgroundColor: theme.dark
                        ? "rgba(42,138,112,0.15)"
                        : "rgba(42,138,112,0.08)",
                    },
                  ]}
                  cornerSmoothing={1}
                >
                  <Ionicons
                    name="people-outline"
                    size={36}
                    color={theme.colors.primary}
                  />
                </SquircleView>

                <Text
                  style={[
                    styles.emptyTitle,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  Comienza tu legado
                </Text>
                <Text
                  style={[
                    styles.emptySubtitle,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Crea un grupo para empezar a nominar y premiar a tus amigos.
                </Text>

                <Pressable
                  onPress={handleCreateGroup}
                  style={({ pressed }) => [
                    styles.emptyButton,
                    {
                      opacity: pressed ? 0.9 : 1,
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                    },
                  ]}
                >
                  <SquircleView
                    style={[
                      styles.emptyButtonInner,
                      { backgroundColor: theme.colors.primary },
                    ]}
                    cornerSmoothing={1}
                  >
                    <Ionicons
                      name="add"
                      size={20}
                      color={theme.colors.onPrimary}
                    />
                    <Text
                      style={[
                        styles.emptyButtonText,
                        { color: theme.colors.onPrimary },
                      ]}
                    >
                      Crear un grupo
                    </Text>
                  </SquircleView>
                </Pressable>
              </SquircleView>
            </Animated.View>
          ) : (
            // Groups Grid
            <View style={styles.bentoGrid}>
              {groups.map((group, index) => (
                <GroupCardItem
                  key={group.id}
                  group={group}
                  index={index}
                  onPress={() => handleGroupPress(group.id)}
                />
              ))}

              {/* "Add New" Card */}
              <Animated.View
                entering={FadeInDown.duration(400).delay(
                  100 + groups.length * 80
                )}
                style={styles.bentoItem}
              >
                <Pressable
                  onPress={handleCreateGroup}
                  style={({ pressed }) => [
                    {
                      opacity: pressed ? 0.8 : 1,
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                    },
                  ]}
                >
                  <SquircleView
                    style={[
                      styles.groupCard,
                      styles.createCard,
                      {
                        borderColor: theme.colors.outlineVariant,
                        borderWidth: 2,
                      },
                    ]}
                    cornerSmoothing={1}
                  >
                    <SquircleView
                      style={[
                        styles.createIconContainer,
                        {
                          backgroundColor: theme.dark
                            ? "rgba(255,255,255,0.06)"
                            : "rgba(0,0,0,0.04)",
                        },
                      ]}
                      cornerSmoothing={1}
                    >
                      <Ionicons
                        name="add"
                        size={28}
                        color={theme.colors.onSurfaceVariant}
                      />
                    </SquircleView>
                    <Text
                      style={[
                        styles.createText,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      Nuevo grupo
                    </Text>
                  </SquircleView>
                </Pressable>
              </Animated.View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 120,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 38,
    letterSpacing: 0.5,
    lineHeight: 44,
  },
  subtitle: {
    fontFamily: "Archivo-Medium",
    fontSize: 14,
    letterSpacing: 0.3,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 8,
  },
  headerButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },

  // Divider
  divider: {
    height: 1,
    marginTop: 16,
    marginBottom: 20,
  },

  // Bento Grid
  bentoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: CARD_GAP,
  },
  bentoItem: {
    width: CARD_WIDTH,
  },

  // Group Card
  groupCard: {
    borderRadius: 22,
    padding: 16,
    aspectRatio: 1,
    justifyContent: "space-between",
  },
  groupIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  groupInfo: {
    flex: 1,
    justifyContent: "flex-end",
  },
  groupName: {
    fontFamily: "Archivo-Bold",
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 6,
  },
  groupMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontFamily: "Archivo-Medium",
    fontSize: 12,
  },
  roleBadge: {
    position: "absolute",
    top: 14,
    right: 14,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  roleBadgeText: {
    fontFamily: "Archivo-Bold",
    fontSize: 10,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  // Create Card
  createCard: {
    borderStyle: "dashed",
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  createIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  createText: {
    fontFamily: "Archivo-Medium",
    fontSize: 13,
    letterSpacing: 0.3,
  },

  // Empty State
  emptyContainer: {
    marginTop: 20,
  },
  emptyCard: {
    borderRadius: 24,
    padding: 36,
    alignItems: "center",
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: "Archivo-Bold",
    fontSize: 20,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: "Archivo-Medium",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    width: "100%",
  },
  emptyButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 16,
  },
  emptyButtonText: {
    fontFamily: "Archivo-Bold",
    fontSize: 16,
    letterSpacing: 0.3,
  },

  // Skeleton
  skeletonIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  skeletonTextLong: {
    height: 14,
    borderRadius: 7,
    width: "70%",
    position: "absolute",
    bottom: 34,
    left: 16,
  },
  skeletonTextShort: {
    height: 12,
    borderRadius: 6,
    width: "45%",
    position: "absolute",
    bottom: 16,
    left: 16,
  },
});
