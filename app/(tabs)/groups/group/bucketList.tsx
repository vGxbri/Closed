import { Ionicons } from "@expo/vector-icons";
import { BlurTargetView } from "expo-blur";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useMemo, useState, useRef } from "react";
import {
  Dimensions,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Text, useTheme } from "react-native-paper";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BucketListCard } from "../../../../components/ui/BucketListCard";
import { CategoryFilter } from "../../../../components/ui/CategoryFilter";
import { BottomSheetModal } from "../../../../components/ui/BottomSheetModal";
import { ConfirmDialog } from "../../../../components/ui/ConfirmDialog";
import { CustomHeader } from "../../../../components/ui/CustomHeader";
import { useSnackbar } from "@/components/ui/SnackbarContext";
import { useAuth } from "../../../../hooks";
import { useBucketList } from "../../../../hooks/useBucketList";
import { bucketListService } from "../../../../services/bucketList.service";
import { BucketListItem, BucketListCategory } from "../../../../types/database";

// ─── Constants ────────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get("window");

const CATEGORY_OPTIONS: { key: BucketListCategory; label: string; icon: string }[] = [
  { key: "restaurants", label: "Restaurantes", icon: "restaurant-outline" },
  { key: "travel", label: "Viajes", icon: "airplane-outline" },
  { key: "movies", label: "Pelis/Series", icon: "film-outline" },
  { key: "gifts", label: "Regalos", icon: "gift-outline" },
  { key: "other", label: "Ideas", icon: "bulb-outline" },
];

type TabKey = "pending" | "completed";

// ─── Skeleton ───────────────────────────────────────────────────────────
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
          {/* Checkbox placeholder */}
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
          {/* Text placeholders */}
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
          {/* Category placeholder */}
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

// ─── Tab Pill ───────────────────────────────────────────────────────────
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
          { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
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
            color={isActive ? theme.colors.onPrimary : theme.colors.onSurfaceVariant}
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
  }
);
TabPill.displayName = "TabPill";

// ─── Create Item Sheet Content ──────────────────────────────────────────
interface CreateSheetProps {
  groupId: string;
  onCreated: () => void;
  onDismiss: () => void;
}

const CreateItemSheet = React.memo<CreateSheetProps>(
  ({ groupId, onCreated, onDismiss }) => {
    const theme = useTheme();
    const insets = useSafeAreaInsets();
    const { showSnackbar } = useSnackbar();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [selectedCategory, setSelectedCategory] = useState<BucketListCategory>("other");
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handlePickImage = useCallback(async () => {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    }, []);

    const handleSave = useCallback(async () => {
      if (!title.trim()) {
        showSnackbar("Escribe un título para tu deseo", "info");
        return;
      }
      try {
        setIsSaving(true);
        Keyboard.dismiss();

        let uploadedImageUrl: string | undefined;
        if (imageUri) {
          uploadedImageUrl = await bucketListService.uploadItemImage(groupId, imageUri);
        }

        await bucketListService.createItem({
          group_id: groupId,
          title: title.trim(),
          description: description.trim() || undefined,
          category: selectedCategory,
          image_url: uploadedImageUrl,
        });

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        showSnackbar("Deseo añadido", "success");
        onCreated();
      } catch (e) {
        console.error("Error creating bucket list item:", e);
        showSnackbar("Error al crear el deseo", "error");
      } finally {
        setIsSaving(false);
      }
    }, [title, description, selectedCategory, imageUri, groupId, onCreated, showSnackbar]);

    return (
      <View style={[styles.sheetContent, { paddingBottom: Math.max(insets.bottom + 16, 32) }]}>
        <Text style={[styles.sheetTitle, { color: theme.colors.onSurface }]}>
          Nuevo deseo
        </Text>

        {/* Image preview / picker */}
        <Pressable
          onPress={handlePickImage}
          style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
        >
          <SquircleView
            style={[
              styles.imagePicker,
              {
                backgroundColor: theme.colors.surfaceVariant,
                borderColor: theme.colors.outlineVariant,
                borderWidth: 1,
              },
            ]}
            cornerSmoothing={1}
          >
            {imageUri ? (
              <>
                <Image
                  source={{ uri: imageUri }}
                  style={StyleSheet.absoluteFillObject}
                  contentFit="cover"
                  transition={200}
                />
                <View
                  style={[
                    StyleSheet.absoluteFillObject,
                    {
                      backgroundColor: "rgba(0,0,0,0.3)",
                      borderRadius: 16,
                      justifyContent: "center",
                      alignItems: "center",
                    },
                  ]}
                >
                  <Ionicons name="camera-outline" size={24} color="rgba(255,255,255,0.9)" />
                  <Text style={styles.imagePickerTextLight}>Cambiar imagen</Text>
                </View>
              </>
            ) : (
              <View style={styles.imagePickerEmpty}>
                <Ionicons
                  name="image-outline"
                  size={28}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text
                  style={[
                    styles.imagePickerText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Añadir imagen (opcional)
                </Text>
              </View>
            )}
          </SquircleView>
        </Pressable>

        {/* Title input */}
        <SquircleView
          style={[
            styles.inputContainer,
            {
              backgroundColor: theme.colors.surfaceVariant,
              borderColor: theme.colors.outlineVariant,
              borderWidth: 1,
            },
          ]}
          cornerSmoothing={1}
        >
          <TextInput
            style={[styles.input, { color: theme.colors.onSurface }]}
            placeholder="¿Qué queréis hacer juntos?"
            placeholderTextColor={theme.colors.outline}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
            autoFocus
          />
        </SquircleView>

        {/* Description input */}
        <SquircleView
          style={[
            styles.inputContainer,
            {
              backgroundColor: theme.colors.surfaceVariant,
              borderColor: theme.colors.outlineVariant,
              borderWidth: 1,
            },
          ]}
          cornerSmoothing={1}
        >
          <TextInput
            style={[styles.input, styles.inputMultiline, { color: theme.colors.onSurface }]}
            placeholder="Notas o detalles (opcional)"
            placeholderTextColor={theme.colors.outline}
            value={description}
            onChangeText={setDescription}
            multiline
            maxLength={300}
          />
        </SquircleView>

        {/* Category selector */}
        <Text
          style={[
            styles.categoryLabel,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          Categoría
        </Text>
        <View style={styles.categoryGrid}>
          {CATEGORY_OPTIONS.map((cat) => {
            const isActive = selectedCategory === cat.key;
            return (
              <Pressable
                key={cat.key}
                onPress={() => setSelectedCategory(cat.key)}
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
              >
                <SquircleView
                  style={[
                    styles.categoryChip,
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
                    name={cat.icon as keyof typeof Ionicons.glyphMap}
                    size={15}
                    color={
                      isActive
                        ? theme.colors.onPrimary
                        : theme.colors.onSurfaceVariant
                    }
                  />
                  <Text
                    style={[
                      styles.categoryChipText,
                      {
                        color: isActive
                          ? theme.colors.onPrimary
                          : theme.colors.onSurfaceVariant,
                      },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </SquircleView>
              </Pressable>
            );
          })}
        </View>

        {/* Save button */}
        <Pressable
          onPress={handleSave}
          disabled={isSaving || !title.trim()}
          style={({ pressed }) => [
            {
              opacity: pressed || isSaving ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
        >
          <SquircleView
            style={[
              styles.saveButton,
              {
                backgroundColor: title.trim()
                  ? theme.colors.primary
                  : theme.colors.surfaceVariant,
              },
            ]}
            cornerSmoothing={1}
          >
            <Ionicons
              name={isSaving ? "hourglass-outline" : "add"}
              size={20}
              color={
                title.trim()
                  ? theme.colors.onPrimary
                  : theme.colors.outline
              }
            />
            <Text
              style={[
                styles.saveButtonText,
                {
                  color: title.trim()
                    ? theme.colors.onPrimary
                    : theme.colors.outline,
                },
              ]}
            >
              {isSaving ? "Guardando..." : "Añadir deseo"}
            </Text>
          </SquircleView>
        </Pressable>
      </View>
    );
  }
);
CreateItemSheet.displayName = "CreateItemSheet";

// ─── Main Screen ────────────────────────────────────────────────────────
export default function BucketListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const { user } = useAuth();

  const backgroundRef = React.useRef(null);

  const [activeTab, setActiveTab] = useState<TabKey>("pending");
  const [createSheetVisible, setCreateSheetVisible] = useState(false);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BucketListItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BucketListItem | null>(null);

  const {
    items,
    pendingItems,
    completedItems,
    isLoading,
    pendingCount,
    completedCount,
    activeCategory,
    setActiveCategory,
    fetchItems,
    addItem,
    toggleItem,
    deleteItem,
  } = useBucketList(id);

  // ─── Filtered items by tab ──────────────
  const displayItems = useMemo(() => {
    return activeTab === "pending" ? pendingItems : completedItems;
  }, [activeTab, pendingItems, completedItems]);

  // ─── Handlers ───────────────────────────
  const handleToggleComplete = useCallback(
    async (itemId: string, currentlyCompleted: boolean) => {
      try {
        await toggleItem(itemId, currentlyCompleted);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        showSnackbar(
          currentlyCompleted ? "Deseo marcado como pendiente" : "¡Deseo completado!",
          "success"
        );
      } catch (e) {
        console.error("Error toggling item:", e);
        showSnackbar("Error al actualizar", "error");
      }
    },
    [toggleItem, showSnackbar]
  );

  const handleItemPress = useCallback((item: BucketListItem) => {
    // For now, just toggle - could open detail in the future
    handleToggleComplete(item.id, item.is_completed);
  }, [handleToggleComplete]);

  const handleLongPress = useCallback(
    (item: BucketListItem) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSelectedItem(item);
      setActionSheetVisible(true);
    },
    []
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteItem(deleteTarget.id);
      showSnackbar("Deseo eliminado", "success");
    } catch (e) {
      console.error("Error deleting item:", e);
      showSnackbar("Error al eliminar", "error");
    }
    setDeleteTarget(null);
  }, [deleteTarget, deleteItem, showSnackbar]);

  const handleCreated = useCallback(() => {
    setCreateSheetVisible(false);
    fetchItems();
  }, [fetchItems]);

  const handleCreatePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCreateSheetVisible(true);
  }, []);

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
          {/* ─── Title ─── */}
          <Animated.View
            entering={FadeInUp.duration(500)}
            style={styles.titleBlock}
          >
            <Text
              style={[styles.screenTitle, { color: theme.colors.primary }]}
            >
              Bucket List
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

          {/* ─── Divider ─── */}
          <Animated.View
            entering={FadeIn.duration(400).delay(50)}
            style={[
              styles.divider,
              { backgroundColor: theme.colors.outlineVariant },
            ]}
          />

          {/* ─── Tabs ─── */}
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

          {/* ─── Category Filter ─── */}
          {!isLoading && items.length > 0 && (
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

          {/* ─── Content ─── */}
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
                  style={[
                    styles.emptyTitle,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  {activeTab === "pending"
                    ? activeCategory
                      ? "Sin deseos en esta categoría"
                      : "¡Tu lista de deseos está vacía!"
                    : "Aún no habéis completado ningún deseo"}
                </Text>
                <Text
                  style={[
                    styles.emptySubtitle,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {activeTab === "pending"
                    ? activeCategory
                      ? "Prueba con otra categoría o añade un deseo nuevo."
                      : "Añade restaurantes, viajes, películas o lo que soñéis hacer juntos."
                    : "Cuando completéis un deseo, aparecerá aquí como recuerdo."}
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
                        Añadir deseo
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

        {/* ─── FAB ─── */}
        {!isLoading && activeTab === "pending" && (
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
                <Ionicons
                  name="add"
                  size={28}
                  color={theme.colors.onPrimary}
                />
              </SquircleView>
            </Pressable>
          </Animated.View>
        )}
      </BlurTargetView>

      {/* ─── Create Bottom Sheet ─── */}
      <BottomSheetModal
        visible={createSheetVisible}
        onDismiss={() => setCreateSheetVisible(false)}
        blurTarget={backgroundRef}
      >
        <CreateItemSheet
          groupId={id}
          onCreated={handleCreated}
          onDismiss={() => setCreateSheetVisible(false)}
        />
      </BottomSheetModal>

      {/* ─── Action Bottom Sheet (long press) ─── */}
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
              style={[styles.actionSheetTitle, { color: theme.colors.onSurface }]}
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
              {/* Toggle complete */}
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
                  handleToggleComplete(selectedItem.id, selectedItem.is_completed);
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

              {/* Delete */}
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
                  Eliminar deseo
                </Text>
              </Pressable>
            </SquircleView>
          </View>
        )}
      </BottomSheetModal>

      {/* ─── Delete Confirmation ─── */}
      <ConfirmDialog
        visible={!!deleteTarget}
        title="Eliminar deseo"
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

// ─── Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 0 },

  // Title
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

  // Divider
  divider: { height: 1, marginTop: 16, marginBottom: 20 },

  // Tabs
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

  // Filter
  filterContainer: {
    marginBottom: 18,
  },

  // Item list
  itemList: { gap: 10 },

  // Skeleton
  skeletonCard: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  skeletonRow: {
    flexDirection: "row",
    alignItems: "center",
  },

  // Empty
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

  // FAB
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

  // Create Sheet
  sheetContent: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  sheetTitle: {
    fontFamily: "Archivo-Bold",
    fontSize: 20,
    marginBottom: 20,
  },
  imagePicker: {
    height: 120,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
  },
  imagePickerEmpty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  imagePickerText: {
    fontFamily: "Archivo-Medium",
    fontSize: 13,
  },
  imagePickerTextLight: {
    fontFamily: "Archivo-Medium",
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    marginTop: 4,
  },
  inputContainer: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 2,
    marginBottom: 12,
  },
  input: {
    fontFamily: "Archivo-Medium",
    fontSize: 15,
    paddingVertical: 12,
  },
  inputMultiline: {
    minHeight: 60,
    textAlignVertical: "top",
  },
  categoryLabel: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 13,
    letterSpacing: 0.3,
    marginBottom: 10,
    marginTop: 4,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 20,
  },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  categoryChipText: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 13,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
  },
  saveButtonText: {
    fontFamily: "Archivo-Bold",
    fontSize: 16,
  },

  // Action Sheet
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
