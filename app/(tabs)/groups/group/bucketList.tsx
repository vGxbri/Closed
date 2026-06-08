/**
 * Widget Lista de deseos del grupo
 */
import { Ionicons } from "@expo/vector-icons";
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

import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { BucketListCard } from "@/components/ui/BucketListCard";
import { CategoryFilter } from "@/components/ui/CategoryFilter";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CustomHeader } from "@/components/ui/CustomHeader";
import { useSnackbar } from "@/components/ui/SnackbarContext";
import { useBucketList } from "@/hooks/useBucketList";
import { BucketListItem } from "@/types/database";

type TabKey = "pending" | "completed";

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
              width: 28,
              height: 28,
              borderRadius: 9,
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
                width: "70%",
                backgroundColor: theme.dark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.06)",
              }}
            />
            <View
              style={{
                height: 11,
                borderRadius: 6,
                width: "45%",
                backgroundColor: theme.dark
                  ? "rgba(255,255,255,0.05)"
                  : "rgba(0,0,0,0.04)",
              }}
            />
          </View>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
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

export default function BucketListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();

  const backgroundRef = React.useRef(null);

  const [activeTab, setActiveTab] = useState<TabKey>("pending");
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BucketListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BucketListItem | null>(null);

  const {
    allItems,
    pendingItems,
    completedItems,
    isLoading,
    pendingCount,
    completedCount,
    activeCategory,
    setActiveCategory,
    toggleItem,
    deleteItem,
  } = useBucketList(id);

  const displayItems = useMemo(() => {
    return activeTab === "pending" ? pendingItems : completedItems;
  }, [activeTab, pendingItems, completedItems]);

  const handleToggleComplete = useCallback(
    async (itemId: string, currentlyCompleted: boolean) => {
      try {
        await toggleItem(itemId, currentlyCompleted);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch {
        showSnackbar("Error al actualizar", "error");
      }
    },
    [toggleItem, showSnackbar],
  );

  const handleItemPress = useCallback(
    (item: BucketListItem) => {
      handleToggleComplete(item.id, item.is_completed);
    },
    [handleToggleComplete],
  );

  const handleLongPress = useCallback((item: BucketListItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedItem(item);
    setActionSheetVisible(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteItem(deleteTarget.id);
    } catch {
      showSnackbar("Error al eliminar", "error");
    }
    setDeleteTarget(null);
  }, [deleteTarget, deleteItem, showSnackbar]);

  const handleCreatePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: "/groups/group/createBucketItem",
      params: { id },
    } as any);
  }, [router, id]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <BlurTargetView
        ref={backgroundRef}
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
              Planes
            </Text>
            <Text
              style={[
                styles.screenSubtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {isLoading
                ? "Cargando..."
                : `${pendingCount} pendiente${pendingCount !== 1 ? "s" : ""} · ${completedCount} completado${completedCount !== 1 ? "s" : ""}`}
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
              label="Por hacer"
              count={pendingCount}
              isActive={activeTab === "pending"}
              onPress={() => setActiveTab("pending")}
              icon="sparkles-outline"
            />
            <TabPill
              label="Completados"
              count={completedCount}
              isActive={activeTab === "completed"}
              onPress={() => setActiveTab("completed")}
              icon="checkmark-circle-outline"
            />
          </Animated.View>

          {!isLoading && allItems.length > 0 && (
            <Animated.View
              entering={FadeInDown.duration(300).delay(100)}
              style={styles.filterContainer}
            >
              <CategoryFilter
                activeCategory={activeCategory}
                onCategoryChange={setActiveCategory}
              />
            </Animated.View>
          )}

          {isLoading ? (
            <View style={styles.itemList}>
              {[0, 1, 2, 3, 4].map((i) => (
                <SkeletonCard key={i} index={i} />
              ))}
            </View>
          ) : displayItems.length === 0 ? (
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
                    name={
                      activeTab === "pending"
                        ? "heart-outline"
                        : "checkmark-done-outline"
                    }
                    size={36}
                    color={theme.colors.primary}
                  />
                </SquircleView>

                <Text
                  style={[styles.emptyTitle, { color: theme.colors.onSurface }]}
                >
                  {activeTab === "pending"
                    ? activeCategory
                      ? "Sin planes en esta categoría"
                      : "¡Aún no tenéis ningún plan!"
                    : "Aún no habéis completado ningún plan"}
                </Text>
                <Text
                  style={[
                    styles.emptySubtitle,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {activeTab === "pending"
                    ? activeCategory
                      ? "Prueba con otra categoría o añade un plan nuevo."
                      : "Añade restaurantes, viajes, películas o lo que queréis hacer juntos."
                    : "Cuando completéis un plan, aparecerá aquí como recuerdo."}
                </Text>

                {activeTab === "pending" && !activeCategory && (
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
                        Añadir plan
                      </Text>
                    </SquircleView>
                  </Pressable>
                )}
              </SquircleView>
            </Animated.View>
          ) : (
            <View style={styles.itemList}>
              {displayItems.map((item, index) => (
                <BucketListCard
                  key={item.id}
                  item={item}
                  index={index}
                  onToggleComplete={handleToggleComplete}
                  onPress={handleItemPress}
                  onLongPress={handleLongPress}
                />
              ))}
            </View>
          )}
        </ScrollView>

        {!isLoading && activeTab === "pending" && allItems.length > 0 && (
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

      <BottomSheetModal
        visible={actionSheetVisible}
        onDismiss={() => {
          setActionSheetVisible(false);
          setSelectedItem(null);
        }}
        blurTarget={backgroundRef}
      >
        {selectedItem && (
          <View
            style={[
              styles.actionSheetContent,
              { paddingBottom: Math.max(insets.bottom + 24, 40) },
            ]}
          >
            <Text
              style={[
                styles.actionSheetTitle,
                { color: theme.colors.onSurface },
              ]}
              numberOfLines={1}
            >
              {selectedItem.title}
            </Text>

            <SquircleView
              style={[
                styles.actionMenuCard,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  borderColor: theme.colors.outlineVariant,
                  borderWidth: 1,
                },
              ]}
              cornerSmoothing={1}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.actionOption,
                  {
                    backgroundColor: pressed
                      ? theme.colors.outlineVariant
                      : "transparent",
                  },
                ]}
                onPress={() => {
                  setActionSheetVisible(false);
                  handleToggleComplete(
                    selectedItem.id,
                    selectedItem.is_completed,
                  );
                }}
              >
                <SquircleView
                  style={[
                    styles.actionIconBox,
                    { backgroundColor: theme.colors.surface },
                  ]}
                  cornerSmoothing={1}
                >
                  <Ionicons
                    name={
                      selectedItem.is_completed
                        ? "refresh-outline"
                        : "checkmark-circle-outline"
                    }
                    size={20}
                    color={theme.colors.primary}
                  />
                </SquircleView>
                <Text
                  style={[
                    styles.actionOptionText,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  {selectedItem.is_completed
                    ? "Marcar como pendiente"
                    : "Marcar como completado"}
                </Text>
              </Pressable>

              <View
                style={[
                  styles.actionDivider,
                  { backgroundColor: theme.colors.outlineVariant },
                ]}
              />

              <Pressable
                style={({ pressed }) => [
                  styles.actionOption,
                  {
                    backgroundColor: pressed
                      ? theme.colors.outlineVariant
                      : "transparent",
                  },
                ]}
                onPress={() => {
                  setActionSheetVisible(false);
                  setTimeout(() => setDeleteTarget(selectedItem), 300);
                }}
              >
                <SquircleView
                  style={[
                    styles.actionIconBox,
                    { backgroundColor: theme.colors.errorContainer },
                  ]}
                  cornerSmoothing={1}
                >
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color={theme.colors.error}
                  />
                </SquircleView>
                <Text
                  style={[
                    styles.actionOptionText,
                    { color: theme.colors.error },
                  ]}
                >
                  Eliminar plan
                </Text>
              </Pressable>
            </SquircleView>
          </View>
        )}
      </BottomSheetModal>

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Eliminar plan"
        message={`¿Eliminar "${deleteTarget?.title}"? Esta acción no se puede deshacer.`}
        type="error"
        confirmText="Eliminar"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        showCancel={true}
        blurTargetRef={backgroundRef}
      />
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

  filterContainer: {
    marginBottom: 18,
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

  actionSheetContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  actionSheetTitle: {
    fontFamily: "Archivo-Bold",
    fontSize: 18,
    marginBottom: 16,
  },
  actionMenuCard: {
    borderRadius: 20,
    overflow: "hidden",
  },
  actionOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 14,
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
  },
  actionOptionText: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 15,
    flex: 1,
  },
  actionDivider: {
    height: 1,
    marginHorizontal: 16,
  },
});
