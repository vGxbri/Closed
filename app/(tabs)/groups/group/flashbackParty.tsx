import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Text, useTheme } from "react-native-paper";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSnackbar } from "@/components/ui/SnackbarContext";
import { flashbackService } from "@/services/flashback.service";
import {
  FlashbackPartyWithDetails,
  FlashbackPhotoWithUser,
} from "@/types/database";
import { BottomSheetModal } from "../../../../components/ui/BottomSheetModal";
import { ConfirmDialog } from "../../../../components/ui/ConfirmDialog";
import { CustomHeader } from "../../../../components/ui/CustomHeader";
import { CreatePartyModal } from "./flashback";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const GRID_GAP = 4;
const COLS = 3;
const PHOTO_SIZE = (SCREEN_WIDTH - 24 * 2 - GRID_GAP * (COLS - 1)) / COLS;

// ─── Full Screen Photo Viewer ─────────────────────────────────────────
const FlashbackPhotoViewer = React.memo<{
  visible: boolean;
  photos: FlashbackPhotoWithUser[];
  initialIndex: number;
  onClose: () => void;
}>(({ visible, photos, initialIndex, onClose }) => {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showUI, setShowUI] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const backgroundOpacity = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      setShowUI(true);
      setIsClosing(false);
      setCurrentIndex(initialIndex);
      translateY.value = 0;
      scale.value = 1;
      backgroundOpacity.value = 1;

      setTimeout(() => {
        if (flatListRef.current && initialIndex >= 0 && initialIndex < photos.length) {
          flatListRef.current.scrollToIndex({ index: initialIndex, animated: false });
        }
      }, 0);
    }
  }, [visible, initialIndex, photos.length, translateY, scale, backgroundOpacity]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const handleClose = useCallback(() => {
    setIsClosing(false);
    onClose();
  }, [onClose]);

  const panGesture = Gesture.Pan()
    .enabled(visible && !isClosing)
    .activeOffsetY([-10, 10])
    .failOffsetX([-20, 20])
    .onUpdate((event) => {
      translateY.value = event.translationY;
      scale.value = Math.max(0.8, 1 - Math.abs(event.translationY) / SCREEN_HEIGHT);
      backgroundOpacity.value = Math.max(0.2, 1 - Math.abs(event.translationY) / (SCREEN_HEIGHT / 2));
    })
    .onEnd((event) => {
      if (Math.abs(event.translationY) > 120 || Math.abs(event.velocityY) > 800) {
        runOnJS(setIsClosing)(true);
        const destY = event.translationY + event.velocityY * 0.2;
        translateY.value = withTiming(destY, { duration: 250 });
        scale.value = withTiming(0.4, { duration: 250 });
        backgroundOpacity.value = withTiming(0, { duration: 250 }, (finished) => {
          if (finished) runOnJS(handleClose)();
        });
      } else {
        translateY.value = withTiming(0, { duration: 250 });
        scale.value = withTiming(1, { duration: 250 });
        backgroundOpacity.value = withTiming(1, { duration: 250 });
      }
    });

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  const animatedBackgroundStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
  }));

  const topUIStyle = useAnimatedStyle(() => ({
    opacity: withTiming(showUI ? 1 : 0, { duration: 200 }),
    transform: [{ translateY: withTiming(showUI ? 0 : -20, { duration: 200 }) }],
  }));

  const bottomUIStyle = useAnimatedStyle(() => ({
    opacity: withTiming(showUI ? 1 : 0, { duration: 200 }),
    transform: [{ translateY: withTiming(showUI ? 0 : 20, { duration: 200 }) }],
  }));

  if (photos.length === 0) return null;

  const currentPhoto = photos[currentIndex] || photos[0];
  const toggleUI = () => setShowUI((prev) => !prev);

  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        { zIndex: visible ? 1000 : -1, elevation: visible ? 100 : 0 },
      ]}
      pointerEvents={visible ? "auto" : "none"}
    >
      {visible && (
        <>
          <Animated.View style={[StyleSheet.absoluteFill, animatedBackgroundStyle]}>
            <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.95)" }]} />
          </Animated.View>

          <Animated.View
            style={[
              { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 },
              animatedBackgroundStyle,
              topUIStyle,
            ]}
            pointerEvents={showUI ? "box-none" : "none"}
          >
            <Animated.View
              entering={FadeInUp.duration(400)}
              style={[viewerStyles.topBar, { paddingTop: Math.max(insets.top, 20) + 8 }]}
            >
              <TouchableOpacity
                onPress={handleClose}
                style={viewerStyles.closeBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="close" size={26} color="#FFFFFF" />
              </TouchableOpacity>

              <View style={viewerStyles.topInfo}>
                {currentPhoto.user && (
                  <Text style={viewerStyles.author}>{currentPhoto.user.display_name}</Text>
                )}
                <Text style={viewerStyles.date}>
                  {new Date(currentPhoto.created_at).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </Text>
              </View>
            </Animated.View>
          </Animated.View>

          <GestureDetector gesture={panGesture}>
            <Animated.View style={[{ flex: 1 }, animatedImageStyle]}>
              <FlatList
                ref={flatListRef}
                data={photos}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.id}
                onViewableItemsChanged={onViewableItemsChanged}
                viewabilityConfig={viewabilityConfig}
                getItemLayout={(_, index) => ({
                  length: SCREEN_WIDTH,
                  offset: SCREEN_WIDTH * index,
                  index,
                })}
                initialScrollIndex={
                  initialIndex >= 0 && initialIndex < photos.length ? initialIndex : 0
                }
                renderItem={({ item }) => (
                  <View style={viewerStyles.itemContainer}>
                    <Pressable
                      style={viewerStyles.imagePressable}
                      onPress={toggleUI}
                    >
                      <Image
                        source={{ uri: item.photo_url }}
                        style={viewerStyles.image}
                        contentFit="contain"
                      />
                    </Pressable>
                  </View>
                )}
              />
            </Animated.View>
          </GestureDetector>

          <Animated.View
            style={[
              { position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10 },
              animatedBackgroundStyle,
              bottomUIStyle,
            ]}
            pointerEvents={showUI ? "box-none" : "none"}
          >
            <Animated.View
              entering={FadeInDown.duration(400)}
              style={[viewerStyles.bottomBar, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}
            >
              <View style={viewerStyles.metadataRow}>
                <View style={viewerStyles.metadataItem}>
                  <Ionicons name="image-outline" size={14} color="rgba(255,255,255,0.5)" />
                  <Text style={viewerStyles.metadataText}>
                    Foto #{currentPhoto.shot_number}
                  </Text>
                </View>
                <View style={viewerStyles.metadataItem}>
                  <Text style={viewerStyles.metadataText}>
                    {currentIndex + 1} de {photos.length}
                  </Text>
                </View>
              </View>
            </Animated.View>
          </Animated.View>
        </>
      )}
    </View>
  );
});

FlashbackPhotoViewer.displayName = "FlashbackPhotoViewer";

const viewerStyles = StyleSheet.create({
  itemContainer: {
    width: SCREEN_WIDTH,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    zIndex: 10,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  topInfo: { flex: 1, marginLeft: 16 },
  author: { fontFamily: "Archivo-Bold", fontSize: 16, color: "#FFFFFF" },
  date: {
    fontFamily: "Archivo-Medium",
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginTop: 1,
  },
  imagePressable: {
    flex: 1,
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  image: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.7 },
  bottomBar: { paddingHorizontal: 24, zIndex: 10 },
  metadataRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  metadataItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  metadataText: {
    fontFamily: "Archivo-Medium",
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
  },
});

export default function FlashbackPartyScreen() {
  const { id, partyId } = useLocalSearchParams<{
    id: string;
    partyId?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();

  const [party, setParty] = useState<FlashbackPartyWithDetails | null>(null);
  const [photos, setPhotos] = useState<FlashbackPhotoWithUser[]>([]);
  const [archivedParties, setArchivedParties] = useState<FlashbackPartyWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSwitchSheet, setShowSwitchSheet] = useState(false);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);

  const loadPartyData = useCallback(async (pId: string) => {
    try {
      const [partyData, photosData] = await Promise.all([
        flashbackService.getPartyById(pId),
        flashbackService.getPartyPhotos(pId),
      ]);
      setParty(partyData);
      setPhotos(photosData);
    } catch (e) {
      console.error("Error loading party data:", e);
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const [archived, initialPartyId] = await (async () => {
        const arch = await flashbackService.getPartyArchive(id);
        const target = partyId || (arch.length > 0 ? arch[0].id : null);
        return [arch, target] as const;
      })();
      setArchivedParties(archived);
      if (initialPartyId) {
        await loadPartyData(initialPartyId);
      }
    } catch (e) {
      console.error("Error loading flashback data:", e);
    } finally {
      setIsLoading(false);
    }
  }, [id, partyId, loadPartyData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleSwitchParty = async (pId: string) => {
    setShowSwitchSheet(false);
    setIsLoading(true);
    await loadPartyData(pId);
    setIsLoading(false);
  };

  const formatPartyDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const uniquePhotographers = new Set(photos.map((p) => p.taken_by)).size;

  const allParties = (() => {
    const list: FlashbackPartyWithDetails[] = [];
    if (party) list.push(party);
    for (const ap of archivedParties) {
      if (!party || ap.id !== party.id) list.push(ap);
    }
    return list;
  })();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteParty = async () => {
    if (!party || isDeleting) return;
    try {
      setIsDeleting(true);
      await flashbackService.deleteParty(party.id);
      showSnackbar("Flashback eliminado", "success");
      router.back();
    } catch (e) {
      console.error("Error deleting party:", e);
      showSnackbar("Error al eliminar el flashback", "error");
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <CustomHeader
          title={party?.name || "Flashback"}
          showBackButton
          rightAction={
            party ? (
              <TouchableOpacity
                onPress={() => setShowDeleteConfirm(true)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
              </TouchableOpacity>
            ) : undefined
          }
        />

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Switch flashback dropdown */}
          {allParties.length > 0 && (
            <Pressable
              onPress={() => setShowSwitchSheet(true)}
              style={({ pressed }) => [
                { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.98 : 1 }], marginBottom: 12 },
              ]}
            >
              <SquircleView
                style={[
                  styles.switchButton,
                  {
                    backgroundColor: theme.colors.surface,
                    borderColor: theme.colors.outlineVariant,
                    borderWidth: 1,
                  },
                ]}
                cornerSmoothing={1}
              >
                <Ionicons name="swap-horizontal-outline" size={16} color={theme.colors.onSurfaceVariant} />
                <Text style={[styles.switchButtonText, { color: theme.colors.onSurfaceVariant }]}>
                  {party?.name ?? "Cambiar flashback"}
                </Text>
                <Ionicons name="chevron-down" size={14} color={theme.colors.onSurfaceVariant} />
              </SquircleView>
            </Pressable>
          )}

          {/* Stats header */}
          {party && photos.length > 0 && (
            <Animated.View entering={FadeIn.duration(400)} style={styles.statsRow}>
              <View style={styles.statItem}>
                <Ionicons
                  name="camera-outline"
                  size={16}
                  color={theme.colors.primary}
                />
                <Text style={[styles.statText, { color: theme.colors.onSurface }]}>
                  {photos.length} foto{photos.length !== 1 ? "s" : ""}
                </Text>
              </View>
              <View style={styles.statDot} />
              <View style={styles.statItem}>
                <Ionicons
                  name="people-outline"
                  size={16}
                  color={theme.colors.primary}
                />
                <Text style={[styles.statText, { color: theme.colors.onSurface }]}>
                  {uniquePhotographers} fotógrafo{uniquePhotographers !== 1 ? "s" : ""}
                </Text>
              </View>
            </Animated.View>
          )}

          {/* Photo grid */}
          {photos.length > 0 ? (
            <View style={styles.photoGrid}>
              {photos.map((photo, index) => (
                <Animated.View
                  key={photo.id}
                  entering={FadeInUp.duration(400).delay(
                    Math.min(index * 80, 1500)
                  )}
                  style={styles.photoWrapper}
                >
                  <Pressable
                    onPress={() => {
                      setViewerInitialIndex(index);
                      setViewerVisible(true);
                    }}
                    style={({ pressed }) => [
                      { flex: 1, opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    <SquircleView
                      style={[
                        styles.photoCard,
                        {
                          backgroundColor: theme.colors.surfaceVariant,
                        },
                      ]}
                      cornerSmoothing={0.8}
                    >
                      <Image
                        source={{ uri: photo.photo_url }}
                        style={styles.photoImage}
                        contentFit="cover"
                        transition={300}
                      />
                      {/* Photo info overlay */}
                      <View style={styles.photoOverlay}>
                        <Text style={styles.photoUser} numberOfLines={1}>
                          {photo.user?.display_name || "Anónimo"}
                        </Text>
                      </View>
                    </SquircleView>
                  </Pressable>
                </Animated.View>
              ))}
            </View>
          ) : !isLoading ? (
            <Animated.View
              entering={FadeIn.duration(400)}
              style={styles.emptyContainer}
            >
              <Ionicons
                name="images-outline"
                size={48}
                color={theme.colors.onSurfaceVariant}
              />
              <Text
                style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}
              >
                Aún no hay fotos
              </Text>
            </Animated.View>
          ) : (
            <View style={styles.loadingGrid}>
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Animated.View
                  key={i}
                  entering={FadeIn.duration(300).delay(i * 60)}
                  style={styles.photoWrapper}
                >
                  <SquircleView
                    style={[
                      styles.photoCard,
                      { backgroundColor: theme.colors.surfaceVariant },
                    ]}
                    cornerSmoothing={0.8}
                  />
                </Animated.View>
              ))}
            </View>
          )}
        </ScrollView>
        
        {/* FAB */}
        <Animated.View
          entering={FadeIn.duration(400).delay(300)}
          style={[styles.fabContainer, { bottom: Math.max(insets.bottom + 24, 40) }]}
        >
          <Pressable
            onPress={() => setShowCreateModal(true)}
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

        <CreatePartyModal
          visible={showCreateModal}
          onDismiss={() => setShowCreateModal(false)}
          groupId={id!}
          onCreated={() => {
            router.replace({ pathname: "/groups/group/flashback", params: { id } } as any);
          }}
        />

        <FlashbackPhotoViewer
          visible={viewerVisible}
          photos={photos}
          initialIndex={viewerInitialIndex}
          onClose={() => setViewerVisible(false)}
        />

        <BottomSheetModal
          visible={showSwitchSheet}
          onDismiss={() => setShowSwitchSheet(false)}
        >
          <View style={styles.sheetContent}>
            <Text style={[styles.sheetTitle, { color: theme.colors.onSurface }]}>
              Flashbacks
            </Text>
            <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
              {allParties.map((ap) => {
                const isCurrent = party?.id === ap.id;
                return (
                  <Pressable
                    key={ap.id}
                    onPress={() => !isCurrent && handleSwitchParty(ap.id)}
                    style={({ pressed }) => [
                      styles.sheetRow,
                      {
                        backgroundColor:
                          isCurrent
                            ? theme.colors.primaryContainer
                            : pressed
                              ? theme.colors.surfaceVariant
                              : "transparent",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.sheetRowName,
                        { color: isCurrent ? theme.colors.onSurface : theme.colors.onSurfaceVariant },
                      ]}
                      numberOfLines={1}
                    >
                      {ap.name}
                    </Text>
                    <Text style={[styles.sheetRowMeta, { color: theme.colors.onSurfaceVariant }]}>
                      {formatPartyDate(ap.starts_at)}
                    </Text>
                    <Text style={[styles.sheetRowMeta, { color: theme.colors.onSurfaceVariant }]}>
                      {ap.photos_count} foto{ap.photos_count !== 1 ? "s" : ""}
                    </Text>
                    {isCurrent ? (
                      <Ionicons name="checkmark" size={16} color={theme.colors.primary} />
                    ) : (
                      <Ionicons name="chevron-forward" size={16} color={theme.colors.onSurfaceVariant} />
                    )}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </BottomSheetModal>

        <ConfirmDialog
          visible={showDeleteConfirm}
          title="Eliminar flashback"
          message={`¿Eliminar "${party?.name}"? Se borrarán todas las fotos. Esta acción no se puede deshacer.`}
          type="error"
          confirmText={isDeleting ? "Eliminando..." : "Eliminar"}
          cancelText="Cancelar"
          onConfirm={handleDeleteParty}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 8 },

  // Switch button
  switchButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  switchButtonText: {
    fontFamily: "Archivo-Medium",
    fontSize: 13,
  },

  // Switch sheet
  sheetContent: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  sheetTitle: {
    fontFamily: "Archivo-Bold",
    fontSize: 18,
    marginBottom: 12,
  },
  sheetScroll: {
    maxHeight: 400,
  },
  sheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  sheetRowName: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 15,
    flex: 1,
  },
  sheetRowMeta: {
    fontFamily: "Archivo-Medium",
    fontSize: 12,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
    paddingVertical: 8,
  },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontFamily: "Archivo-SemiBold", fontSize: 13 },
  statDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128,128,128,0.4)",
  },

  // Photo grid
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  loadingGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  photoWrapper: {
    width: PHOTO_SIZE,
    height: PHOTO_SIZE * 1.25,
  },
  photoCard: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  photoImage: {
    flex: 1,
  },
  photoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  photoUser: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 10,
    color: "#FFFFFF",
  },

  // Empty
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 80,
    gap: 12,
  },
  emptyText: {
    fontFamily: "Archivo-Medium",
    fontSize: 15,
    textAlign: "center",
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
});
