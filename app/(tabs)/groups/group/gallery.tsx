import { Ionicons } from "@expo/vector-icons";
import { BlurTargetView } from "expo-blur";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { VideoView, useVideoPlayer } from "expo-video";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Text, useTheme } from "react-native-paper";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInRight,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CustomHeader } from "../../../../components/ui/CustomHeader";
import { useSnackbar } from "../../../../components/ui/SnackbarContext";
import { useAuth, useGroup } from "../../../../hooks";
import { galleryService } from "../../../../services/gallery.service";
import { GalleryImageWithUser } from "../../../../types/database";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const GRID_GAP = 3;
const NUM_COLUMNS = 3;
const IMAGE_SIZE = (SCREEN_WIDTH - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;
const STORAGE_LIMIT_BYTES = 1 * 1024 * 1024 * 1024; // 1 GB

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

// ─── Image Thumbnail ────────────────────────────────────────────────────
interface ThumbnailProps {
  image: GalleryImageWithUser;
  index: number;
  onPress: () => void;
}

const ImageThumbnail = React.memo<ThumbnailProps>(
  ({ image, index, onPress }) => {
    return (
      <Animated.View entering={FadeIn.duration(300).delay(index * 20)}>
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <View>
            <Image
              source={{ uri: image.media_url }}
              style={styles.thumbnail}
              contentFit="cover"
              transition={200}
            />
            {image.media_type === 'video' && (
              <View style={styles.videoIndicator}>
                <Ionicons name="play" size={16} color="#FFFFFF" />
              </View>
            )}
          </View>
        </Pressable>
      </Animated.View>
    );
  }
);

ImageThumbnail.displayName = "ImageThumbnail";

// ─── Full Screen Viewer ────────────────────────────────────────────────
interface ViewerProps {
  visible: boolean;
  image: GalleryImageWithUser | null;
  onClose: () => void;
  onDelete: (image: GalleryImageWithUser) => void;
  canDelete: boolean;
}

const MediaViewer = React.memo<ViewerProps>(
  ({ visible, image, onClose, onDelete, canDelete }) => {
    const insets = useSafeAreaInsets();
    const theme = useTheme();

    // Video player setup
    const player = useVideoPlayer(image?.media_type === 'video' ? image.media_url : null, (player) => {
      player.loop = true;
      player.play();
    });

    if (!image) return null;

    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={onClose}
      >
        <View style={styles.viewerContainer}>
          {/* Blurred Background */}
          <BlurTargetView style={StyleSheet.absoluteFill} />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.85)" }]} />

          {/* Top bar */}
          <Animated.View 
            entering={FadeInUp.duration(400)}
            style={[
              styles.viewerTopBar,
              { paddingTop: insets.top + 8 },
            ]}
          >
            <TouchableOpacity
              onPress={onClose}
              style={styles.viewerCloseBtn}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="close" size={26} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.viewerTopInfo}>
              {image.uploader && (
                <Text style={styles.viewerAuthor}>
                  {image.uploader.display_name}
                </Text>
              )}
              <Text style={styles.viewerDate}>
                {new Date(image.created_at).toLocaleDateString("es-ES", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </Text>
            </View>

            {canDelete && (
              <TouchableOpacity
                onPress={() => onDelete(image)}
                style={styles.viewerDeleteBtn}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Ionicons name="trash-outline" size={20} color="#FF6B6B" />
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Media Content */}
          <Animated.View 
            entering={FadeIn.duration(400)}
            style={styles.viewerImageContainer}
          >
            {image.media_type === 'video' ? (
              <VideoView
                player={player}
                style={styles.viewerVideo}
                contentFit="contain"
                nativeControls
                allowsPictureInPicture
              />
            ) : (
              <Image
                source={{ uri: image.media_url }}
                style={styles.viewerImage}
                contentFit="contain"
                transition={300}
              />
            )}
          </Animated.View>

          {/* Bottom Info / Caption */}
          <Animated.View 
            entering={FadeInDown.duration(400)}
            style={[
              styles.viewerBottomBar,
              { paddingBottom: insets.bottom + 20 },
            ]}
          >
            {image.caption ? (
              <Text style={styles.viewerCaption}>{image.caption}</Text>
            ) : (
              <View style={styles.viewerMetadataRow}>
                <View style={styles.viewerMetadataItem}>
                  <Ionicons 
                    name={image.media_type === 'video' ? 'videocam-outline' : 'image-outline'} 
                    size={14} 
                    color="rgba(255,255,255,0.5)" 
                  />
                  <Text style={styles.viewerMetadataText}>{formatBytes(image.file_size || 0)}</Text>
                </View>
              </View>
            )}
          </Animated.View>
        </View>
      </Modal>
    );
  }
);

MediaViewer.displayName = "MediaViewer";

// ─── Skeleton Grid ─────────────────────────────────────────────────────
const SkeletonGrid = React.memo(() => {
  const theme = useTheme();
  return (
    <View style={styles.grid}>
      {Array.from({ length: 9 }).map((_, i) => (
        <Animated.View
          key={i}
          entering={FadeIn.duration(300).delay(i * 40)}
        >
          <View
            style={[
              styles.thumbnail,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
          />
        </Animated.View>
      ))}
    </View>
  );
});

SkeletonGrid.displayName = "SkeletonGrid";

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

  const [viewerImage, setViewerImage] = useState<GalleryImageWithUser | null>(
    null
  );
  const [viewerVisible, setViewerVisible] = useState(false);
  const [storageUsed, setStorageUsed] = useState(0);

  // Fetch images and storage
  const fetchImages = useCallback(
    async (pageNum: number = 0, append: boolean = false) => {
      if (!id) return;
      try {
        if (!append) setIsLoading(true);
        const [imageData, storageData] = await Promise.all([
          galleryService.getGroupImages(id, pageNum),
          pageNum === 0 ? galleryService.getStorageUsed(id) : Promise.resolve(storageUsed)
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
    },
    [id, showSnackbar, storageUsed]
  );

  useEffect(() => {
    fetchImages(0);
  }, [fetchImages]);

  // Load more
  const loadMore = useCallback(() => {
    if (!hasMore || isLoading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchImages(nextPage, true);
  }, [hasMore, isLoading, page, fetchImages]);

  // Upload
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

      showSnackbar(
        `${uris.length} ${uris.length === 1 ? "archivo subido" : "archivos subidos"}`,
        "success"
      );

      // Refresh
      setPage(0);
      await fetchImages(0);
    } catch (error: any) {
      showSnackbar(error.message || "Error al subir los archivos", "error");
    } finally {
      setIsUploading(false);
    }
  }, [id, showSnackbar, fetchImages]);

  // Delete
  const handleDelete = useCallback(
    async (image: GalleryImageWithUser) => {
      Alert.alert(
        "Eliminar foto",
        "¿Estás seguro de que quieres eliminar esta foto?",
        [
          { text: "Cancelar", style: "cancel" },
          {
            text: "Eliminar",
            style: "destructive",
            onPress: async () => {
              try {
                await galleryService.deleteImage(image.id, image.media_url);
                setImages((prev) => prev.filter((i) => i.id !== image.id));
                setViewerVisible(false);
                setViewerImage(null);
                showSnackbar("Foto eliminada", "success");
              } catch (error) {
                console.error("Error deleting image:", error);
                showSnackbar("Error al eliminar la foto", "error");
              }
            },
          },
        ]
      );
    },
    [showSnackbar]
  );

  // Can delete: own images or admin
  const canDeleteImage = useCallback(
    (image: GalleryImageWithUser) => {
      return image.uploaded_by === user?.id || isAdmin;
    },
    [user, isAdmin]
  );

  // Open viewer
  const openViewer = useCallback((image: GalleryImageWithUser) => {
    setViewerImage(image);
    setViewerVisible(true);
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <CustomHeader
          title=""
          showBackButton={true}
          rightAction={
            <TouchableOpacity onPress={handleUpload} disabled={isUploading}>
              {isUploading ? (
                <ActivityIndicator
                  size="small"
                  color={theme.colors.primary}
                />
              ) : (
                <SquircleView
                  style={[
                    styles.uploadButton,
                    { backgroundColor: theme.colors.primary },
                  ]}
                  cornerSmoothing={1}
                >
                  <Ionicons name="add" size={18} color={theme.colors.onPrimary} />
                  <Text
                    style={[
                      styles.uploadButtonText,
                      { color: theme.colors.onPrimary },
                    ]}
                  >
                    Subir
                  </Text>
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
            const { layoutMeasurement, contentOffset, contentSize } =
              nativeEvent;
            const isBottom =
              layoutMeasurement.height + contentOffset.y >=
              contentSize.height - 200;
            if (isBottom) loadMore();
          }}
          scrollEventThrottle={400}
        >
          {/* Header */}
          <Animated.View
            entering={FadeInUp.duration(500)}
            style={styles.headerBlock}
          >
            <Text
              style={[styles.screenTitle, { color: theme.colors.primary }]}
            >
              Archivo
            </Text>
            <Text
              style={[
                styles.screenSubtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {images.length > 0
                ? `${images.length} fotos compartidas`
                : "La galería compartida del grupo"}
            </Text>

            {/* Storage usage indicator in header */}
            <View style={styles.storageHeaderContainer}>
              <View style={styles.storageTextRow}>
                <Text style={[styles.storageHeaderText, { color: theme.colors.onSurfaceVariant }]}>
                  Almacenamiento
                </Text>
                <Text style={[styles.storageHeaderUsed, { color: theme.colors.onSurfaceVariant }]}>
                  {formatBytes(storageUsed)} / 1 GB
                </Text>
              </View>
              <View style={[styles.storageHeaderBarBg, { backgroundColor: theme.colors.surfaceVariant }]}>
                <View 
                  style={[
                    styles.storageHeaderBarFill, 
                    { 
                      width: `${Math.min((storageUsed / STORAGE_LIMIT_BYTES) * 100, 100)}%`,
                      backgroundColor: (storageUsed / STORAGE_LIMIT_BYTES) > 0.9 ? "#FF6B6B" : theme.colors.primary 
                    }
                  ]} 
                />
              </View>
            </View>
          </Animated.View>

          {/* Divider */}
          <Animated.View
            entering={FadeIn.duration(400).delay(50)}
            style={[
              styles.divider,
              { backgroundColor: theme.colors.outlineVariant },
            ]}
          />

          {isLoading ? (
            <SkeletonGrid />
          ) : images.length > 0 ? (
            <View style={styles.grid}>
              {images.map((image, index) => (
                <ImageThumbnail
                  key={image.id}
                  image={image}
                  index={index}
                  onPress={() => openViewer(image)}
                />
              ))}
            </View>
          ) : (
            /* Empty state */
            <Animated.View
              entering={FadeInDown.duration(500).delay(100)}
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
                      backgroundColor: theme.colors.surfaceVariant,
                      borderColor: theme.colors.outlineVariant,
                      borderWidth: 1,
                    },
                  ]}
                  cornerSmoothing={1}
                >
                  <Ionicons
                    name="images-outline"
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
                  Aún no hay fotos
                </Text>
                <Text
                  style={[
                    styles.emptySubtitle,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Sube la primera foto y empieza a llenar el archivo de
                  recuerdos del grupo.
                </Text>

                <Pressable
                  onPress={handleUpload}
                  disabled={isUploading}
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
                      name="camera-outline"
                      size={20}
                      color={theme.colors.onPrimary}
                    />
                    <Text
                      style={[
                        styles.emptyButtonText,
                        { color: theme.colors.onPrimary },
                      ]}
                    >
                      Subir fotos
                    </Text>
                  </SquircleView>
                </Pressable>
              </SquircleView>
            </Animated.View>
          )}
        </ScrollView>

        {/* Upload overlay */}
        {isUploading && (
          <View style={styles.uploadOverlay}>
            <SquircleView
              style={[
                styles.uploadOverlayCard,
                { backgroundColor: theme.colors.surface },
              ]}
              cornerSmoothing={1}
            >
              <ActivityIndicator
                size="large"
                color={theme.colors.primary}
              />
              <Text
                style={[
                  styles.uploadOverlayText,
                  { color: theme.colors.onSurface },
                ]}
              >
                Subiendo fotos...
              </Text>
            </SquircleView>
          </View>
        )}
      </View>

      {/* Full-screen media viewer */}
      <MediaViewer
        visible={viewerVisible}
        image={viewerImage}
        onClose={() => {
          setViewerVisible(false);
          setViewerImage(null);
        }}
        onDelete={handleDelete}
        canDelete={viewerImage ? canDeleteImage(viewerImage) : false}
      />
    </>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },

  // Header
  headerBlock: {
    paddingHorizontal: 24,
    marginTop: 4,
    marginBottom: 4,
  },
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
  divider: {
    height: 1,
    marginHorizontal: 24,
    marginTop: 16,
    marginBottom: 16,
  },

  // Upload button
  uploadButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  uploadButtonText: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 14,
    letterSpacing: 0.2,
  },

  // Grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
  },
  thumbnail: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
  },
  videoIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Empty state
  emptyContainer: {
    paddingHorizontal: 24,
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

  // Upload overlay
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  uploadOverlayCard: {
    paddingHorizontal: 36,
    paddingVertical: 28,
    borderRadius: 22,
    alignItems: "center",
    gap: 14,
  },
  uploadOverlayText: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 15,
  },

  viewerMetadataText: {
    fontFamily: "Archivo-Medium",
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
  },

  // Storage header
  storageHeaderContainer: {
    marginTop: 16,
    gap: 8,
  },
  storageTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  storageHeaderText: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 12,
    letterSpacing: 0.2,
  },
  storageHeaderUsed: {
    fontFamily: "Archivo-Medium",
    fontSize: 11,
  },
  storageHeaderBarBg: {
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  storageHeaderBarFill: {
    height: "100%",
    borderRadius: 2,
  },

  // Viewer
  viewerContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  viewerTopBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    zIndex: 10,
  },
  viewerCloseBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  viewerDeleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,107,107,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
  viewerTopInfo: {
    flex: 1,
    marginLeft: 16,
  },
  viewerAuthor: {
    fontFamily: "Archivo-Bold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  viewerDate: {
    fontFamily: "Archivo-Medium",
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginTop: 1,
  },
  viewerImageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  viewerImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  viewerVideo: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  viewerBottomBar: {
    paddingHorizontal: 24,
    zIndex: 10,
  },
  viewerCaption: {
    fontFamily: "Archivo-Medium",
    fontSize: 15,
    color: "rgba(255,255,255,0.95)",
    lineHeight: 22,
    textAlign: "center",
  },
  viewerMetadataRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  viewerMetadataItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
});
