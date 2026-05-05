import { Ionicons } from "@expo/vector-icons";
import { BlurTargetView } from "expo-blur";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Gestos y Animaciones
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { CustomHeader } from "../../../../components/ui/CustomHeader";
import { useSnackbar } from "../../../../components/ui/SnackbarContext";
import { useAuth, useGroup } from "../../../../hooks";
import { galleryService } from "../../../../services/gallery.service";
import { GalleryImageWithUser } from "../../../../types/database";

const AnimatedImage = Animated.createAnimatedComponent(Image);

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const STORAGE_LIMIT_BYTES = 1 * 1024 * 1024 * 1024; // 1 GB

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const getSimulatedHeight = (id: string) => {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = id.charCodeAt(i) + ((hash << 5) - hash);
  }
  hash = Math.abs(hash);
  return 180 + (hash % 120);
};

// ─── Masonry Grid Component ─────────────────────────────────────────────
interface MasonryProps {
  images: GalleryImageWithUser[];
  onImagePress: (image: GalleryImageWithUser) => void;
}

const MasonryGrid = React.memo<MasonryProps>(({ images, onImagePress }) => {
  const columns: GalleryImageWithUser[][] = [[], []];

  images.forEach((img, i) => {
    columns[i % 2].push(img);
  });

  return (
    <View style={styles.masonryContainer}>
      {columns.map((col, colIndex) => (
        <View key={`col-${colIndex}`} style={styles.masonryColumn}>
          {col.map((image, index) => {
            const height = useMemo(() => getSimulatedHeight(image.id), [image.id]);

            return (
              <Animated.View
                key={image.id}
                entering={FadeInDown.duration(400).delay(index * 50)}
                style={{ marginBottom: 12 }}
              >
                <Pressable
                  onPress={() => onImagePress(image)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
                >
                  <View>
                    <AnimatedImage
                      source={{ uri: image.media_url }}
                      style={[styles.masonryImage, { height }]}
                      contentFit="cover"
                      transition={200}
                      sharedTransitionTag={`gallery-${image.id}`}
                    />
                    {image.media_type === "video" && (
                      <View style={styles.videoIndicator}>
                        <Ionicons name="play" size={16} color="#FFFFFF" />
                      </View>
                    )}
                  </View>
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      ))}
    </View>
  );
});

MasonryGrid.displayName = "MasonryGrid";

// ─── Skeleton Grid ───────────────────────────────────────────────────
const SkeletonGrid = React.memo(() => {
  const theme = useTheme();
  const col1Heights = [220, 180, 250];
  const col2Heights = [180, 260, 190];

  return (
    <View style={styles.masonryContainer}>
      <View style={styles.masonryColumn}>
        {col1Heights.map((h, i) => (
          <Animated.View key={`skel1-${i}`} entering={FadeIn.duration(300).delay(i * 40)} style={{ marginBottom: 12 }}>
            <View style={[styles.masonryImage, { height: h, backgroundColor: theme.colors.surfaceVariant }]} />
          </Animated.View>
        ))}
      </View>
      <View style={styles.masonryColumn}>
        {col2Heights.map((h, i) => (
          <Animated.View key={`skel2-${i}`} entering={FadeIn.duration(300).delay(i * 40)} style={{ marginBottom: 12 }}>
            <View style={[styles.masonryImage, { height: h, backgroundColor: theme.colors.surfaceVariant }]} />
          </Animated.View>
        ))}
      </View>
    </View>
  );
});

SkeletonGrid.displayName = "SkeletonGrid";

// ─── Elemento Individual del Visor (Controla el Video) ──────────────────
const ViewerItem = React.memo(({ item, isVisible }: { item: GalleryImageWithUser; isVisible: boolean }) => {
  const player = useVideoPlayer(item.media_type === "video" ? item.media_url : null, (player) => {
    player.loop = true;
    if (isVisible) player.play();
  });

  useEffect(() => {
    if (item.media_type === "video" && player) {
      if (isVisible) player.play();
      else player.pause();
    }
  }, [isVisible, player, item.media_type]);

  return (
    <View style={styles.viewerItemContainer}>
      {item.media_type === "video" ? (
        <VideoView player={player} style={styles.viewerVideo} contentFit="contain" allowsPictureInPicture />
      ) : (
        <AnimatedImage
          source={{ uri: item.media_url }}
          style={styles.viewerImage}
          contentFit="contain"
          sharedTransitionTag={`gallery-${item.id}`}
        />
      )}
    </View>
  );
});

ViewerItem.displayName = "ViewerItem";

// ─── Full Screen Viewer con Gestos y Swipe Horizontal ───────────────────
interface ViewerProps {
  visible: boolean;
  images: GalleryImageWithUser[];
  initialIndex: number;
  onClose: () => void;
  onDelete: (image: GalleryImageWithUser) => void;
  canDelete: (image: GalleryImageWithUser) => boolean;
}

const MediaViewer = React.memo<ViewerProps>(({ visible, images, initialIndex, onClose, onDelete, canDelete }) => {
  const insets = useSafeAreaInsets();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const backgroundOpacity = useSharedValue(1);

  // Sincronizar el índice inicial al abrir
  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      translateY.value = 0;
      scale.value = 1;
      backgroundOpacity.value = 1;

      // Hacemos scroll instantáneo a la foto correcta
      setTimeout(() => {
        if (flatListRef.current && initialIndex >= 0 && initialIndex < images.length) {
          flatListRef.current.scrollToIndex({ index: initialIndex, animated: false });
        }
      }, 0);
    }
  }, [visible, initialIndex, images.length, translateY, scale, backgroundOpacity]);

  // Actualizar el índice al hacer swipe horizontal
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  // Lógica del gesto: activa el vertical, falla si es horizontal (para que actúe la FlatList)
  const panGesture = Gesture.Pan()
    .activeOffsetY([-10, 10]) // Solo se activa si movemos arriba/abajo
    .failOffsetX([-20, 20])   // Falla si movemos a los lados (deja hacer swipe a la galería)
    .onUpdate((event) => {
      translateY.value = event.translationY;
      scale.value = Math.max(0.8, 1 - Math.abs(event.translationY) / SCREEN_HEIGHT);
      backgroundOpacity.value = Math.max(0.2, 1 - Math.abs(event.translationY) / (SCREEN_HEIGHT / 2));
    })
    .onEnd((event) => {
      if (Math.abs(event.translationY) > 120 || Math.abs(event.velocityY) > 800) {
        const destY = event.translationY + event.velocityY * 0.2;
        translateY.value = withTiming(destY, { duration: 250 });
        scale.value = withTiming(0.4, { duration: 250 });
        backgroundOpacity.value = withTiming(0, { duration: 250 }, (finished) => {
          if (finished) runOnJS(onClose)();
        });
      } else {
        translateY.value = withSpring(0, { damping: 15 });
        scale.value = withSpring(1, { damping: 15 });
        backgroundOpacity.value = withTiming(1);
      }
    });

  const animatedImageStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
  }));

  const animatedBackgroundStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
  }));

  if (!visible || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];
  const hasDeletePermission = currentImage ? canDelete(currentImage) : false;

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 1000, elevation: 100 }]}>
      <Animated.View style={[StyleSheet.absoluteFill, animatedBackgroundStyle]}>
        <BlurTargetView style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.9)" }]} />
      </Animated.View>

      <Animated.View style={[{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 }, animatedBackgroundStyle]}>
        <Animated.View entering={FadeInUp.duration(400)} style={[styles.viewerTopBar, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={onClose} style={styles.viewerCloseBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Ionicons name="close" size={26} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.viewerTopInfo}>
            {currentImage.uploader && <Text style={styles.viewerAuthor}>{currentImage.uploader.display_name}</Text>}
            <Text style={styles.viewerDate}>
              {new Date(currentImage.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}
            </Text>
          </View>

          {hasDeletePermission && (
            <TouchableOpacity onPress={() => onDelete(currentImage)} style={styles.viewerDeleteBtn} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
            </TouchableOpacity>
          )}
        </Animated.View>
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[{ flex: 1 }, animatedImageStyle]}>
          <FlatList
            ref={flatListRef}
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.id}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            getItemLayout={(data, index) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * index, index })}
            initialScrollIndex={initialIndex >= 0 && initialIndex < images.length ? initialIndex : 0}
            renderItem={({ item, index }) => <ViewerItem item={item} isVisible={index === currentIndex} />}
          />
        </Animated.View>
      </GestureDetector>

      <Animated.View style={[{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10 }, animatedBackgroundStyle]}>
        <Animated.View entering={FadeInDown.duration(400)} style={[styles.viewerBottomBar, { paddingBottom: insets.bottom + 20 }]}>
          {currentImage.caption ? (
            <Text style={styles.viewerCaption}>{currentImage.caption}</Text>
          ) : (
            <View style={styles.viewerMetadataRow}>
              <View style={styles.viewerMetadataItem}>
                <Ionicons name={currentImage.media_type === "video" ? "videocam-outline" : "image-outline"} size={14} color="rgba(255,255,255,0.5)" />
                <Text style={styles.viewerMetadataText}>{formatBytes(currentImage.file_size || 0)}</Text>
              </View>
              {/* Contador de páginas (Opcional pero muy premium) */}
              <View style={styles.viewerMetadataItem}>
                <Text style={styles.viewerMetadataText}>{currentIndex + 1} de {images.length}</Text>
              </View>
            </View>
          )}
        </Animated.View>
      </Animated.View>
    </View>
  );
});

MediaViewer.displayName = "MediaViewer";

// ─── Main Screen ───────────────────────────────────────────────────────
export default function GalleryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const { user } = useAuth();

  const { group, isAdmin } = useGroup(id);

  const [images, setImages] = useState<GalleryImageWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Estados modificados para soportar el visor con FlatList
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [storageUsed, setStorageUsed] = useState(0);

  const fetchImages = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    if (!id) return;
    try {
      if (!append) setIsLoading(true);
      const [imageData, storageData] = await Promise.all([
        galleryService.getGroupImages(id, pageNum),
        pageNum === 0 ? galleryService.getStorageUsed(id) : Promise.resolve(storageUsed),
      ]);

      if (append) {
        setImages((prev) => [...prev, ...imageData]);
      } else {
        setImages(imageData);
      }
      setStorageUsed(storageData);
      setHasMore(imageData.length >= 20);
    } catch (error) {
      showSnackbar("Error al cargar la galería", "error");
    } finally {
      setIsLoading(false);
    }
  }, [id, showSnackbar, storageUsed]);

  useEffect(() => {
    fetchImages(0);
  }, [fetchImages]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchImages(nextPage, true);
  }, [hasMore, isLoading, page, fetchImages]);

  const handleUpload = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsMultipleSelection: true,
        quality: 0.8,
        selectionLimit: 10,
      });

      if (result.canceled || result.assets.length === 0) return;

      setIsUploading(true);
      const uris = result.assets.map((a) => a.uri);

      await galleryService.uploadMultipleImages(id as string, uris);

      showSnackbar(`${uris.length} ${uris.length === 1 ? "archivo subido" : "archivos subidos"}`, "success");

      setPage(0);
      await fetchImages(0);
    } catch (error: any) {
      showSnackbar(error.message || "Error al subir los archivos", "error");
    } finally {
      setIsUploading(false);
    }
  }, [id, showSnackbar, fetchImages]);

  const handleDelete = useCallback(async (image: GalleryImageWithUser) => {
    Alert.alert("Eliminar foto", "¿Estás seguro de que quieres eliminar esta foto?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Eliminar",
        style: "destructive",
        onPress: async () => {
          try {
            await galleryService.deleteImage(image.id, image.media_url);
            setImages((prev) => prev.filter((i) => i.id !== image.id));
            setViewerVisible(false); // Cerramos el visor para evitar errores de índice
            showSnackbar("Foto eliminada", "success");
          } catch (error) {
            console.error("Error deleting image:", error);
            showSnackbar("Error al eliminar la foto", "error");
          }
        },
      },
    ]);
  }, [showSnackbar]);

  const canDeleteImage = useCallback((image: GalleryImageWithUser) => {
    return image.uploaded_by === user?.id || isAdmin;
  }, [user, isAdmin]);

  // Al abrir, buscamos el índice de la foto en el array completo
  const openViewer = useCallback((image: GalleryImageWithUser) => {
    const index = images.findIndex((img) => img.id === image.id);
    setViewerInitialIndex(index >= 0 ? index : 0);
    setViewerVisible(true);
  }, [images]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <CustomHeader
          title=""
          showBackButton={true}
          rightAction={
            <TouchableOpacity onPress={handleUpload} disabled={isUploading}>
              {isUploading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} />
              ) : (
                <SquircleView style={[styles.uploadButton, { backgroundColor: theme.colors.primary }]} cornerSmoothing={1}>
                  <Ionicons name="add" size={18} color={theme.colors.onPrimary} />
                  <Text style={[styles.uploadButtonText, { color: theme.colors.onPrimary }]}>Subir</Text>
                </SquircleView>
              )}
            </TouchableOpacity>
          }
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: 60 + insets.bottom }}
          showsVerticalScrollIndicator={false}
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            const isBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 200;
            if (isBottom) loadMore();
          }}
          scrollEventThrottle={400}
        >
          <Animated.View entering={FadeInUp.duration(500)} style={styles.headerBlock}>
            <Text style={[styles.screenTitle, { color: theme.colors.primary }]}>Archivo</Text>
            <Text style={[styles.screenSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              {images.length > 0 ? `${images.length} fotos compartidas` : "La galería compartida del grupo"}
            </Text>

            <View style={styles.storageHeaderContainer}>
              <View style={styles.storageTextRow}>
                <Text style={[styles.storageHeaderText, { color: theme.colors.onSurfaceVariant }]}>Almacenamiento</Text>
                <Text style={[styles.storageHeaderUsed, { color: theme.colors.onSurfaceVariant }]}>{formatBytes(storageUsed)} / 1 GB</Text>
              </View>
              <View style={[styles.storageHeaderBarBg, { backgroundColor: theme.colors.surfaceVariant }]}>
                <View
                  style={[
                    styles.storageHeaderBarFill,
                    {
                      width: `${Math.min((storageUsed / STORAGE_LIMIT_BYTES) * 100, 100)}%`,
                      backgroundColor: storageUsed / STORAGE_LIMIT_BYTES > 0.9 ? "#FF6B6B" : theme.colors.primary,
                    },
                  ]}
                />
              </View>
            </View>
          </Animated.View>

          <Animated.View entering={FadeIn.duration(400).delay(50)} style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />

          {isLoading ? (
            <SkeletonGrid />
          ) : images.length > 0 ? (
            <MasonryGrid images={images} onImagePress={openViewer} />
          ) : (
            <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.emptyContainer}>
              <SquircleView style={[styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant, borderWidth: 1 }]} cornerSmoothing={1}>
                <SquircleView style={[styles.emptyIconContainer, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant, borderWidth: 1 }]} cornerSmoothing={1}>
                  <Ionicons name="images-outline" size={36} color={theme.colors.primary} />
                </SquircleView>

                <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>Aún no hay fotos</Text>
                <Text style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>Sube la primera foto y empieza a llenar el archivo de recuerdos del grupo.</Text>

                <Pressable onPress={handleUpload} disabled={isUploading} style={({ pressed }) => [styles.emptyButton, { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
                  <SquircleView style={[styles.emptyButtonInner, { backgroundColor: theme.colors.primary }]} cornerSmoothing={1}>
                    <Ionicons name="camera-outline" size={20} color={theme.colors.onPrimary} />
                    <Text style={[styles.emptyButtonText, { color: theme.colors.onPrimary }]}>Subir fotos</Text>
                  </SquircleView>
                </Pressable>
              </SquircleView>
            </Animated.View>
          )}
        </ScrollView>

        {isUploading && (
          <View style={styles.uploadOverlay}>
            <SquircleView style={[styles.uploadOverlayCard, { backgroundColor: theme.colors.surface }]} cornerSmoothing={1}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text style={[styles.uploadOverlayText, { color: theme.colors.onSurface }]}>Subiendo fotos...</Text>
            </SquircleView>
          </View>
        )}
      </View>

      <MediaViewer
        visible={viewerVisible}
        images={images}
        initialIndex={viewerInitialIndex}
        onClose={() => setViewerVisible(false)}
        onDelete={handleDelete}
        canDelete={canDeleteImage}
      />
    </>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  headerBlock: { paddingHorizontal: 24, marginTop: 4, marginBottom: 4 },
  screenTitle: { fontFamily: "InstrumentSerif-Italic", fontSize: 38, letterSpacing: 0.5, lineHeight: 44 },
  screenSubtitle: { fontFamily: "Archivo-Medium", fontSize: 14, letterSpacing: 0.3, marginTop: 2 },
  divider: { height: 1, marginHorizontal: 24, marginTop: 16, marginBottom: 16 },
  uploadButton: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  uploadButtonText: { fontFamily: "Archivo-SemiBold", fontSize: 14, letterSpacing: 0.2 },

  masonryContainer: { flexDirection: "row", paddingHorizontal: 20, gap: 12 },
  masonryColumn: { flex: 1, flexDirection: "column" },
  masonryImage: { width: "100%", borderRadius: 16, backgroundColor: "rgba(0,0,0,0.05)" },
  videoIndicator: { position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: 14, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },

  emptyContainer: { paddingHorizontal: 24, marginTop: 20 },
  emptyCard: { borderRadius: 24, padding: 36, alignItems: "center" },
  emptyIconContainer: { width: 72, height: 72, borderRadius: 22, justifyContent: "center", alignItems: "center", marginBottom: 20 },
  emptyTitle: { fontFamily: "Archivo-Bold", fontSize: 20, marginBottom: 8 },
  emptySubtitle: { fontFamily: "Archivo-Medium", fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  emptyButton: { width: "100%" },
  emptyButtonInner: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 16 },
  emptyButtonText: { fontFamily: "Archivo-Bold", fontSize: 16, letterSpacing: 0.3 },

  uploadOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center", zIndex: 100 },
  uploadOverlayCard: { paddingHorizontal: 36, paddingVertical: 28, borderRadius: 22, alignItems: "center", gap: 14 },
  uploadOverlayText: { fontFamily: "Archivo-SemiBold", fontSize: 15 },

  storageHeaderContainer: { marginTop: 16, gap: 8 },
  storageTextRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  storageHeaderText: { fontFamily: "Archivo-SemiBold", fontSize: 12, letterSpacing: 0.2 },
  storageHeaderUsed: { fontFamily: "Archivo-Medium", fontSize: 11 },
  storageHeaderBarBg: { height: 4, borderRadius: 2, overflow: "hidden" },
  storageHeaderBarFill: { height: "100%", borderRadius: 2 },

  // Estilos del Visor
  viewerItemContainer: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT, justifyContent: "center", alignItems: "center" },
  viewerTopBar: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 12, zIndex: 10 },
  viewerCloseBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(255,255,255,0.1)", justifyContent: "center", alignItems: "center" },
  viewerDeleteBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,107,107,0.15)", justifyContent: "center", alignItems: "center" },
  viewerTopInfo: { flex: 1, marginLeft: 16 },
  viewerAuthor: { fontFamily: "Archivo-Bold", fontSize: 16, color: "#FFFFFF" },
  viewerDate: { fontFamily: "Archivo-Medium", fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 1 },
  viewerImage: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.7 },
  viewerVideo: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.7 },
  viewerBottomBar: { paddingHorizontal: 24, zIndex: 10 },
  viewerCaption: { fontFamily: "Archivo-Medium", fontSize: 15, color: "rgba(255,255,255,0.95)", lineHeight: 22, textAlign: "center" },
  viewerMetadataRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 12 },
  viewerMetadataItem: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(255,255,255,0.08)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  viewerMetadataText: { fontFamily: "Archivo-Medium", fontSize: 12, color: "rgba(255,255,255,0.5)" },
});