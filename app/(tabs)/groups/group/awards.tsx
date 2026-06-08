/**
 * Widget Premios del grupo
 * Lista de premios y trofeos compartidos entre los miembros del grupo.
 */
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { BlurTargetView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Text, useTheme } from "react-native-paper";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AwardCard } from "@/components/AwardCard";
import { CustomHeader } from "@/components/ui/CustomHeader";
import { useGroup, useGroupAwards } from "@/hooks";
import { supabase } from "@/lib/supabase";
import { Award, AwardStatus } from "@/types/database";

type TabKey = "active" | "completed";

const STATUS_PRIORITY: Record<AwardStatus, number> = {
  voting: 0,
  nominations: 1,
  draft: 2,
  completed: 3,
  archived: 4,
};

const SkeletonCard = React.memo<{ index: number }>(({ index }) => {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeIn.duration(400).delay(index * 80)}>
      <SquircleView
        style={[
          styles.skeletonCard,
          {
            backgroundColor: theme.colors.surfaceVariant,
            borderColor: theme.colors.outlineVariant,
            borderWidth: 1,
          },
        ]}
        cornerSmoothing={1}
      >
        <View style={styles.skeletonRow}>
          <View
            style={{
              width: 46,
              height: 46,
              borderRadius: 15,
              backgroundColor: theme.dark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.06)",
            }}
          />
          <View style={{ flex: 1, gap: 8, marginLeft: 14 }}>
            <View
              style={{
                height: 14,
                borderRadius: 7,
                width: "65%",
                backgroundColor: theme.dark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.06)",
              }}
            />
            <View
              style={{
                height: 11,
                borderRadius: 6,
                width: "40%",
                backgroundColor: theme.dark
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(0,0,0,0.04)",
              }}
            />
          </View>
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              backgroundColor: theme.dark
                ? "rgba(255,255,255,0.06)"
                : "rgba(0,0,0,0.06)",
            }}
          />
        </View>
      </SquircleView>
    </Animated.View>
  );
});
SkeletonCard.displayName = "SkeletonCard";

interface TabPillProps {
  label: string;
  count: number;
  isActive: boolean;
  onPress: () => void;
  icon: keyof typeof Ionicons.glyphMap;
}

const TabPill = React.memo<TabPillProps>(
  ({ label, count, isActive, onPress, icon }) => {
    const theme = useTheme();

    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          {
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          },
        ]}
      >
        <SquircleView
          style={[
            styles.tabPill,
            {
              backgroundColor: isActive
                ? theme.colors.primary
                : theme.colors.surfaceVariant,
              borderColor: isActive
                ? theme.colors.primary
                : theme.colors.outlineVariant,
              borderWidth: 1,
            },
          ]}
          cornerSmoothing={1}
        >
          <Ionicons
            name={icon}
            size={15}
            color={
              isActive ? theme.colors.onPrimary : theme.colors.onSurfaceVariant
            }
          />
          <Text
            style={[
              styles.tabPillLabel,
              {
                color: isActive
                  ? theme.colors.onPrimary
                  : theme.colors.onSurfaceVariant,
              },
            ]}
          >
            {label}
          </Text>
          <SquircleView
            style={[
              styles.tabPillBadge,
              {
                backgroundColor: isActive
                  ? "rgba(255,255,255,0.25)"
                  : theme.dark
                    ? "rgba(255,255,255,0.08)"
                    : "rgba(0,0,0,0.06)",
              },
            ]}
            cornerSmoothing={1}
          >
            <Text
              style={[
                styles.tabPillBadgeText,
                {
                  color: isActive
                    ? theme.colors.onPrimary
                    : theme.colors.onSurfaceVariant,
                },
              ]}
            >
              {count}
            </Text>
          </SquircleView>
        </SquircleView>
      </Pressable>
    );
  },
);
TabPill.displayName = "TabPill";

export default function AwardsListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const [activeTab, setActiveTab] = useState<TabKey>("active");

  const { group, isAdmin } = useGroup(id);
  const { awards, isLoading, refetch } = useGroupAwards(id);

  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!id) return;

      const subscription = supabase
        .channel(`awards-list-realtime:${id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "awards",
            filter: `group_id=eq.${id}`,
          },
          () => {
            refetch();
          },
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }, [id, refetch]),
  );

  const canCreate = isAdmin || group?.settings?.allow_member_nominations;

  const activeAwards = useMemo(
    () =>
      awards
        .filter((a) => a.status !== "completed" && a.status !== "archived")
        .sort((a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]),
    [awards],
  );

  const completedAwards = useMemo(
    () => awards.filter((a) => a.status === "completed"),
    [awards],
  );

  const votingCount = useMemo(
    () => activeAwards.filter((a) => a.status === "voting").length,
    [activeAwards],
  );

  const currentList = activeTab === "active" ? activeAwards : completedAwards;

  const handleAwardPress = useCallback(
    (award: Award) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({
        pathname: "/groups/award/[id]",
        params: { id: award.id, groupId: id },
      } as any);
    },
    [router, id],
  );

  const handleCreatePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/groups/award/create",
      params: { groupId: id },
    } as any);
  }, [router, id]);

  const handleTabChange = useCallback((tab: TabKey) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  }, []);

  const subtitle = useMemo(() => {
    if (isLoading) return "Cargando...";
    if (awards.length === 0) return "Vota y celebra los mejores del grupo";
    const parts: string[] = [];
    if (activeAwards.length > 0) {
      parts.push(
        `${activeAwards.length} activo${activeAwards.length !== 1 ? "s" : ""}`,
      );
    }
    if (votingCount > 0) {
      parts.push(`${votingCount} en votación`);
    }
    if (completedAwards.length > 0) {
      parts.push(
        `${completedAwards.length} completado${completedAwards.length !== 1 ? "s" : ""}`,
      );
    }
    return parts.join(" · ");
  }, [
    isLoading,
    awards.length,
    activeAwards.length,
    votingCount,
    completedAwards.length,
  ]);

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.itemList}>
          {[0, 1, 2, 3, 4].map((i) => (
            <SkeletonCard key={i} index={i} />
          ))}
        </View>
      );
    }

    if (currentList.length === 0) {
      const isActiveTab = activeTab === "active";
      return (
        <Animated.View
          entering={FadeInDown.duration(400).delay(100)}
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
                name={isActiveTab ? "trophy-outline" : "checkmark-done-outline"}
                size={36}
                color={theme.colors.primary}
              />
            </SquircleView>

            <Text
              style={[styles.emptyTitle, { color: theme.colors.onSurface }]}
            >
              {isActiveTab ? "Sin premios activos" : "Sin premios completados"}
            </Text>
            <Text
              style={[
                styles.emptySubtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {isActiveTab
                ? "Crea un premio y deja que el grupo vote por los nominados."
                : "Cuando un premio termine, aparecerá aquí con el ganador."}
            </Text>

            {isActiveTab && canCreate && (
              <Pressable
                onPress={handleCreatePress}
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
                    Crear premio
                  </Text>
                </SquircleView>
              </Pressable>
            )}
          </SquircleView>
        </Animated.View>
      );
    }

    return (
      <View style={styles.itemList}>
        {currentList.map((award, index) => (
          <AwardCard
            key={award.id}
            award={award}
            index={index}
            onPress={() => handleAwardPress(award)}
          />
        ))}
      </View>
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <BlurTargetView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <CustomHeader title="" showBackButton={true} />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: 120 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            entering={FadeInUp.duration(500)}
            style={styles.titleBlock}
          >
            <Text style={[styles.screenTitle, { color: theme.colors.primary }]}>
              Premios
            </Text>
            <Text
              style={[
                styles.screenSubtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {subtitle}
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeIn.duration(400).delay(50)}
            style={[
              styles.divider,
              { backgroundColor: theme.colors.outlineVariant },
            ]}
          />

          <Animated.View
            entering={FadeInDown.duration(300).delay(80)}
            style={styles.tabRow}
          >
            <TabPill
              label="Activos"
              count={activeAwards.length}
              isActive={activeTab === "active"}
              onPress={() => handleTabChange("active")}
              icon="flame-outline"
            />
            <TabPill
              label="Completados"
              count={completedAwards.length}
              isActive={activeTab === "completed"}
              onPress={() => handleTabChange("completed")}
              icon="checkmark-circle-outline"
            />
          </Animated.View>

          {renderContent()}
        </ScrollView>

        {!isLoading && canCreate && currentList.length > 0 && (
          <Animated.View
            entering={FadeIn.duration(400).delay(300)}
            style={[
              styles.fabContainer,
              { bottom: Math.max(insets.bottom + 24, 40) },
            ]}
          >
            <Pressable
              onPress={handleCreatePress}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.92 : 1 }],
                },
              ]}
            >
              <SquircleView
                style={[
                  styles.fab,
                  {
                    backgroundColor: theme.colors.primary,
                    shadowColor: theme.colors.primary,
                  },
                ]}
                cornerSmoothing={1}
              >
                <Ionicons name="add" size={28} color={theme.colors.onPrimary} />
              </SquircleView>
            </Pressable>
          </Animated.View>
        )}
      </BlurTargetView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 0 },

  titleBlock: { marginTop: 4, marginBottom: 4 },
  screenTitle: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 38,
    letterSpacing: 0.5,
    lineHeight: 44,
  },
  screenSubtitle: {
    fontFamily: "Archivo-Medium",
    fontSize: 14,
    letterSpacing: 0.3,
    marginTop: 2,
  },

  divider: { height: 1, marginTop: 16, marginBottom: 20 },

  tabRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },
  tabPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    gap: 7,
  },
  tabPillLabel: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 13,
    letterSpacing: 0.2,
  },
  tabPillBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 22,
    alignItems: "center",
  },
  tabPillBadgeText: {
    fontFamily: "Archivo-Bold",
    fontSize: 11,
  },

  itemList: { gap: 10 },

  skeletonCard: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  emptyContainer: { marginTop: 20 },
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
    fontSize: 17,
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: "Archivo-Medium",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    letterSpacing: 0.1,
    marginBottom: 20,
  },
  emptyButton: { marginTop: 4 },
  emptyButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 16,
  },
  emptyButtonText: {
    fontFamily: "Archivo-Bold",
    fontSize: 15,
  },

  fabContainer: {
    position: "absolute",
    right: 24,
    zIndex: 100,
  },
  fab: {
    width: 58,
    height: 58,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
});
