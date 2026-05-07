import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { BlurTargetView, BlurView } from "expo-blur";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Stack, useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { VideoView, useVideoPlayer } from "expo-video";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View
} from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { File, Paths } from 'expo-file-system';
import RNShare from 'react-native-share';

// Gestos y Animaciones
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
  FadeOutDown,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
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
  isSelectionMode: boolean;
  selectedImageIds: string[];
  onToggleSelect: (id: string) => void;
  onLongPress: (id: string) => void;
  theme: any;
}

const MasonryGrid = React.memo<MasonryProps>(({ images, onImagePress, isSelectionMode, selectedImageIds, onToggleSelect, onLongPress, theme }) => {
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
            const isSelected = selectedImageIds.includes(image.id);

            return (
              <Animated.View
                key={image.id}
                entering={FadeInDown.duration(400).delay(index * 50)}
                style={{ marginBottom: 12 }}
              >
                <Pressable
                  onPress={() => isSelectionMode ? onToggleSelect(image.id) : onImagePress(image)}
                  onLongPress={() => onLongPress(image.id)}
                  style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
                >
                  <View>
                    <AnimatedImage
                      source={{ uri: image.media_url }}
                      style={[styles.masonryImage, { height }]}
                      contentFit="cover"
                      transition={200}
                      sharedTransitionTag={!isSelectionMode ? `gallery-${image.id}` : undefined}
                    />

                    {/* Indicador de vídeo */}
                    {image.media_type === "video" && !isSelectionMode && (
                      <View style={styles.videoIndicator}>
                        <Ionicons name="play" size={16} color="#FFFFFF" />
                      </View>
                    )}

                    {/* Overlay de Selección */}
                    {isSelectionMode && (
                      <Animated.View
                        entering={FadeIn.duration(200)}
                        style={[
                          styles.selectionOverlay,
                          isSelected ? [styles.selectionOverlayActive, { borderColor: theme.colors.primary }] : null
                        ]}
                      >
                        <Ionicons
                          name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                          size={28}
                          color={isSelected ? theme.colors.primary : "rgba(255,255,255,0.7)"}
                          style={styles.selectionIcon}
                        />
                      </Animated.View>
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

const formatTime = (seconds: number): string => {
  if (!seconds || !isFinite(seconds)) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

// ─── Sub-elemento para Vídeo ──────────────────
const VideoPlayerItem = React.memo(({ url, isVisible, showUI, onToggleUI }: { url: string; isVisible: boolean; showUI: boolean; onToggleUI: (force?: boolean) => void }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);
  const scrubberWidth = useRef(SCREEN_WIDTH);

  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
  });

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isVisible) {
      timer = setTimeout(() => setIsMounted(true), 150);
    } else {
      setIsMounted(false);
      setIsPlaying(false);
    }
    return () => clearTimeout(timer);
  }, [isVisible]);

  useEffect(() => {
    if (!player || !isMounted) return;
    if (isVisible) {
      player.play();
      setIsPlaying(true);
    } else {
      player.pause();
    }
  }, [isVisible, player, isMounted]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && player && isVisible && !isSeeking) {
      interval = setInterval(() => {
        setProgress(player.currentTime);
        if (player.duration > 0) setDuration(player.duration);
      }, 250);
    }
    return () => clearInterval(interval);
  }, [isPlaying, player, isVisible, isSeeking]);

  const togglePlayPause = () => {
    if (!player) return;
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
      onToggleUI(true);
    } else {
      player.play();
      setIsPlaying(true);
      onToggleUI(false);
    }
  };

  const toggleMute = () => {
    if (!player) return;
    const newMuted = !isMuted;
    player.muted = newMuted;
    setIsMuted(newMuted);
  };

  const seekTo = (time: number) => {
    if (player) player.currentTime = time;
  };

  const scrubGesture = Gesture.Pan()
    .onBegin((e) => {
      runOnJS(setIsSeeking)(true);
      const pct = Math.max(0, Math.min(1, e.x / SCREEN_WIDTH));
      runOnJS(setProgress)(pct * (duration || 1));
    })
    .onUpdate((e) => {
      const pct = Math.max(0, Math.min(1, e.x / SCREEN_WIDTH));
      runOnJS(setProgress)(pct * (duration || 1));
    })
    .onEnd((e) => {
      const pct = Math.max(0, Math.min(1, e.x / SCREEN_WIDTH));
      const newTime = pct * (duration || 1);
      runOnJS(setProgress)(newTime);
      runOnJS(setIsSeeking)(false);
      runOnJS(seekTo)(newTime);
    });

  const handleScrubberTap = (e: any) => {
    if (!player || !duration) return;
    const touchX = e.nativeEvent.locationX;
    const newTime = (touchX / SCREEN_WIDTH) * duration;
    player.currentTime = newTime;
    setProgress(newTime);
  };

  const progressPct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <View style={styles.videoWrapper}>
      <Pressable style={styles.videoPressable} onPress={togglePlayPause}>
        {isVisible && isMounted && player && (
          <VideoView
            key={url}
            player={player}
            style={styles.viewerVideo}
            contentFit="contain"
            nativeControls={false}
          />
        )}

        {(!isPlaying || !isMounted) && (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={styles.customPlayOverlay}
          >
            <BlurView intensity={40} tint="dark" style={styles.customPlayButton}>
              <Ionicons name="play" size={36} color="#FFFFFF" style={{ marginLeft: 4 }} />
            </BlurView>
          </Animated.View>
        )}
      </Pressable>

      <View style={[styles.videoControlsContainer, { opacity: showUI || !isPlaying || isSeeking ? 1 : 0 }]}>
        <TouchableOpacity onPress={toggleMute} style={styles.muteButton} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name={isMuted ? "volume-mute" : "volume-high"} size={18} color="#FFFFFF" />
        </TouchableOpacity>

        <Text style={styles.videoTimeText}>
          {formatTime(progress)} / {formatTime(duration)}
        </Text>
      </View>

      <GestureDetector gesture={scrubGesture}>
        <Animated.View style={[styles.scrubberContainer, { opacity: showUI || !isPlaying || isSeeking ? 1 : 0 }]}>
          <Pressable onPress={handleScrubberTap} style={styles.scrubberHitbox}>
            <View style={styles.scrubberTrack}>
              <View style={[styles.scrubberFill, { width: `${progressPct}%` }]} />
              <View style={[styles.scrubberThumb, { left: `${progressPct}%` }]} />
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
});

VideoPlayerItem.displayName = "VideoPlayerItem";

// ─── Elemento Individual del Visor ──────────────────
const ViewerItem = React.memo(({ item, isVisible, showUI, onToggleUI }: { item: GalleryImageWithUser; isVisible: boolean; showUI: boolean; onToggleUI: (force?: boolean) => void }) => {
  return (
    <View style={styles.viewerItemContainer}>
      {item.media_type === "video" ? (
        <VideoPlayerItem
          url={item.media_url}
          isVisible={isVisible}
          showUI={showUI}
          onToggleUI={onToggleUI}
        />
      ) : (
        <Pressable style={styles.imagePressable} onPress={() => onToggleUI()}>
          <AnimatedImage
            source={{ uri: item.media_url }}
            style={styles.viewerImage}
            contentFit="contain"
            sharedTransitionTag={`gallery-${item.id}`}
          />
        </Pressable>
      )}
    </View>
  );
});

ViewerItem.displayName = "ViewerItem";

// ─── Full Screen Viewer ───────────────────────────────────────────────
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
  const navigation = useNavigation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showUI, setShowUI] = useState(true);
  const flatListRef = useRef<FlatList>(null);

  const translateY = useSharedValue(0);
  const scale = useSharedValue(1);
  const backgroundOpacity = useSharedValue(1);

  useEffect(() => {
    if (visible) {
      StatusBar.setHidden(true, "fade");
      setShowUI(true);
    } else {
      StatusBar.setHidden(false, "fade");
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
      translateY.value = 0;
      scale.value = 1;
      backgroundOpacity.value = 1;

      setTimeout(() => {
        if (flatListRef.current && initialIndex >= 0 && initialIndex < images.length) {
          flatListRef.current.scrollToIndex({ index: initialIndex, animated: false });
        }
      }, 0);
    }
  }, [visible, initialIndex, images.length, translateY, scale, backgroundOpacity]);

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index);
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const panGesture = Gesture.Pan()
    .activeOffsetY([-10, 10])
    .failOffsetX([-20, 20])
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
    transform: [{ translateY: withTiming(showUI ? 0 : -20, { duration: 200 }) }]
  }));

  const bottomUIStyle = useAnimatedStyle(() => ({
    opacity: withTiming(showUI ? 1 : 0, { duration: 200 }),
    transform: [{ translateY: withTiming(showUI ? 0 : 20, { duration: 200 }) }]
  }));

  if (!visible || images.length === 0) return null;

  const currentImage = images[currentIndex] || images[0];
  const hasDeletePermission = currentImage ? canDelete(currentImage) : false;

  const toggleUI = (force?: boolean) => setShowUI(prev => force !== undefined ? force : !prev);

  return (
    <View style={[StyleSheet.absoluteFill, { zIndex: 1000, elevation: 100 }]}>
      <Animated.View style={[StyleSheet.absoluteFill, animatedBackgroundStyle]}>
        <BlurTargetView style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: "rgba(0,0,0,0.95)" }]} />
      </Animated.View>

      <Animated.View style={[{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10 }, animatedBackgroundStyle, topUIStyle]} pointerEvents={showUI ? "box-none" : "none"}>
        <Animated.View entering={FadeInUp.duration(400)} style={[styles.viewerTopBar, { paddingTop: Math.max(insets.top, 20) + 8 }]}>
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
            renderItem={({ item, index }) => (
              <ViewerItem
                item={item}
                isVisible={index === currentIndex}
                showUI={showUI}
                onToggleUI={toggleUI}
              />
            )}
          />
        </Animated.View>
      </GestureDetector>

      <Animated.View style={[{ position: "absolute", bottom: 0, left: 0, right: 0, zIndex: 10 }, animatedBackgroundStyle, bottomUIStyle]} pointerEvents={showUI ? "box-none" : "none"}>
        <Animated.View entering={FadeInDown.duration(400)} style={[styles.viewerBottomBar, { paddingBottom: Math.max(insets.bottom, 20) + 20 }]}>
          {currentImage.caption ? (
            <Text style={styles.viewerCaption}>{currentImage.caption}</Text>
          ) : (
            <View style={styles.viewerMetadataRow}>
              <View style={styles.viewerMetadataItem}>
                <Ionicons name={currentImage.media_type === "video" ? "videocam-outline" : "image-outline"} size={14} color="rgba(255,255,255,0.5)" />
                <Text style={styles.viewerMetadataText}>{formatBytes(currentImage.file_size || 0)}</Text>
              </View>
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

  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  const [viewerVisible, setViewerVisible] = useState(false);
  const [storageUsed, setStorageUsed] = useState(0);

  // Estados del Modo Selección
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);

  const navigation = useNavigation();

  useEffect(() => {
    const parent = navigation.getParent();
    if (parent) {
      parent.setOptions({ tabBarStyle: { display: "none" } });
    }
    return () => {
      if (parent) {
        parent.setOptions({ tabBarStyle: undefined });
      }
    };
  }, [navigation]);

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
            setViewerVisible(false);
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

  const openViewer = useCallback((image: GalleryImageWithUser) => {
    const index = images.findIndex((img) => img.id === image.id);
    setViewerInitialIndex(index >= 0 ? index : 0);
    setViewerVisible(true);
  }, [images]);

  // Manejadores del Modo Selección
  const toggleSelectionMode = useCallback(() => {
    setIsSelectionMode((prev) => !prev);
    setSelectedImageIds([]);
  }, []);

  const handleToggleSelect = useCallback((imageId: string) => {
    setSelectedImageIds((prev) =>
      prev.includes(imageId) ? prev.filter((id) => id !== imageId) : [...prev, imageId]
    );
  }, []);

  const handleLongPress = useCallback((imageId: string) => {
    if (!isSelectionMode) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsSelectionMode(true);
      setSelectedImageIds([imageId]);
    }
  }, [isSelectionMode]);

  const handleShareSelected = async () => {
    if (selectedImageIds.length === 0) return;

    const filesToShare = images.filter((img) => selectedImageIds.includes(img.id));

    try {
      showSnackbar("Preparando archivos para compartir...", "info");

      const localFileUris = await Promise.all(
        filesToShare.map(async (img) => {
          const ext = img.media_url.split('.').pop()?.split('?')[0] || (img.media_type === "video" ? "mp4" : "jpg");
          const fileName = `share_${img.id}.${ext}`;

          // 1. Usamos la nueva API de Archivos (Paths.cache es el directorio temporal)
          const localFile = new File(Paths.cache, fileName);

          // 2. Comprobamos si existe usando la propiedad síncrona
          if (!localFile.exists) {
            // 3. Descargamos directamente a la instancia del archivo
            await File.downloadFileAsync(img.media_url, localFile);
          }

          // 4. Retornamos la URI local para dársela a RNShare
          return localFile.uri;
        })
      );

      await RNShare.open({
        urls: localFileUris,
        type: '*/*',
        title: 'Archivos multimedia de Closed',
        failOnCancel: false,
      });

      setIsSelectionMode(false);
      setSelectedImageIds([]);

    } catch (error: any) {
      console.error("Error al compartir:", error);
      showSnackbar("Hubo un problema al compartir los archivos", "error");
    }
  };

  const handleDeleteSelected = () => {
    if (selectedImageIds.length === 0) return;
    Alert.alert(
      "Borrar selección",
      `¿Estás seguro de que quieres eliminar ${selectedImageIds.length} archivo(s)?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            const toDelete = images.filter(img => selectedImageIds.includes(img.id));
            const unauthorized = toDelete.filter(img => !canDeleteImage(img));

            if (unauthorized.length > 0) {
              Alert.alert("Aviso", "Solo puedes borrar los archivos que tú has subido o debes ser administrador del grupo.");
              return;
            }

            try {
              for (const img of toDelete) {
                await galleryService.deleteImage(img.id, img.media_url);
              }
              setImages(prev => prev.filter(img => !selectedImageIds.includes(img.id)));
              setSelectedImageIds([]);
              setIsSelectionMode(false);
              showSnackbar(`${toDelete.length} archivo(s) eliminado(s)`, "success");
            } catch (error) {
              showSnackbar("Error al eliminar", "error");
            }
          }
        }
      ]
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <CustomHeader
          title=""
          showBackButton={true}
          rightAction={
            <View style={styles.headerActionsRow}>
              {/* Botón de Selección */}
              <TouchableOpacity onPress={toggleSelectionMode} disabled={images.length === 0}>
                <SquircleView
                  style={[
                    styles.uploadButton,
                    {
                      backgroundColor: isSelectionMode ? theme.colors.primary : theme.colors.surfaceVariant,
                      paddingHorizontal: 10 // Un poco más cuadrado para el icono
                    }
                  ]}
                  cornerSmoothing={1}
                >
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={20}
                    color={isSelectionMode ? theme.colors.onPrimary : theme.colors.onSurface}
                  />
                </SquircleView>
              </TouchableOpacity>

              {/* Botón de Subir */}
              <TouchableOpacity onPress={handleUpload} disabled={isUploading || isSelectionMode}>
                {isUploading ? (
                  <ActivityIndicator size="small" color={theme.colors.primary} style={{ marginHorizontal: 12 }} />
                ) : (
                  <SquircleView
                    style={[
                      styles.uploadButton,
                      {
                        backgroundColor: isSelectionMode ? theme.colors.surfaceVariant : theme.colors.primary,
                        opacity: isSelectionMode ? 0.5 : 1
                      }
                    ]}
                    cornerSmoothing={1}
                  >
                    <Ionicons name="add" size={18} color={isSelectionMode ? theme.colors.onSurface : theme.colors.onPrimary} />
                    <Text style={[styles.uploadButtonText, { color: isSelectionMode ? theme.colors.onSurface : theme.colors.onPrimary }]}>
                      Subir
                    </Text>
                  </SquircleView>
                )}
              </TouchableOpacity>
            </View>
          }
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={{ paddingBottom: isSelectionMode ? 120 : 60 + insets.bottom }}
          showsVerticalScrollIndicator={false}
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            const isBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 200;
            if (isBottom && !isSelectionMode) loadMore();
          }}
          scrollEventThrottle={400}
        >
          <Animated.View entering={FadeInUp.duration(500)} style={styles.headerBlock}>
            <Text style={[styles.screenTitle, { color: theme.colors.primary }]}>Archivo</Text>
            <Text style={[styles.screenSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              {isSelectionMode
                ? `${selectedImageIds.length} seleccionados`
                : images.length > 0 ? `${images.length} fotos compartidas` : "La galería compartida del grupo"
              }
            </Text>

            {!isSelectionMode && (
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
            )}
          </Animated.View>

          <Animated.View entering={FadeIn.duration(400).delay(50)} style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />

          {isLoading ? (
            <SkeletonGrid />
          ) : images.length > 0 ? (
            <MasonryGrid
              images={images}
              onImagePress={openViewer}
              isSelectionMode={isSelectionMode}
              selectedImageIds={selectedImageIds}
              onToggleSelect={handleToggleSelect}
              onLongPress={handleLongPress}
              theme={theme}
            />
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

        {/* Action Bar Flotante (Solo en modo selección) */}
        {isSelectionMode && (
          <Animated.View
            entering={FadeInUp.duration(300)}
            exiting={FadeOutDown.duration(300)}
            style={[
              styles.selectionActionBar,
              { paddingBottom: insets.bottom + 20, backgroundColor: theme.colors.surface }
            ]}
          >
            <Text style={[styles.selectionActionText, { color: theme.colors.onSurface }]}>
              {selectedImageIds.length} {selectedImageIds.length === 1 ? 'archivo' : 'archivos'}
            </Text>
            <View style={styles.selectionActionButtons}>
              <TouchableOpacity onPress={handleShareSelected} disabled={selectedImageIds.length === 0} style={styles.actionBtn}>
                <Ionicons name="share-outline" size={24} color={selectedImageIds.length === 0 ? theme.colors.outline : theme.colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeleteSelected} disabled={selectedImageIds.length === 0} style={styles.actionBtn}>
                <Ionicons name="trash-outline" size={24} color={selectedImageIds.length === 0 ? theme.colors.outline : "#FF6B6B"} />
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

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
  headerActionsRow: { flexDirection: "row", alignItems: "center", gap: 8 },
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

  // Estilos de Selección
  selectionOverlay: { ...StyleSheet.absoluteFillObject, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.2)", borderWidth: 2, borderColor: "transparent", zIndex: 5 },
  selectionOverlayActive: { backgroundColor: "rgba(0,0,0,0.5)" },
  selectionIcon: { position: "absolute", top: 8, right: 8, zIndex: 10, textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },

  selectionActionBar: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 24, paddingTop: 16, borderTopLeftRadius: 24, borderTopRightRadius: 24, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 12, elevation: 20, zIndex: 50 },
  selectionActionText: { fontFamily: "Archivo-Bold", fontSize: 16 },
  selectionActionButtons: { flexDirection: "row", gap: 12 },
  actionBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.05)", justifyContent: "center", alignItems: "center" },

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

  // Estilos del Visor y Pantalla Completa
  viewerItemContainer: { width: SCREEN_WIDTH, height: "100%", justifyContent: "center", alignItems: "center" },
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

  // Custom Video y Scrubber
  videoWrapper: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.7, justifyContent: "center", alignItems: "center" },
  videoPressable: { flex: 1, width: "100%", height: "100%", justifyContent: "center", alignItems: "center" },
  imagePressable: { flex: 1, width: "100%", height: "100%", justifyContent: "center", alignItems: "center" },
  customPlayOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center", zIndex: 20 },
  customPlayButton: { width: 80, height: 80, borderRadius: 40, justifyContent: "center", alignItems: "center", overflow: "hidden", backgroundColor: "rgba(0,0,0,0.3)" },

  // Barra de progreso YouTube
  scrubberContainer: { position: "absolute", bottom: -15, left: 0, right: 0, height: 30, justifyContent: "center", zIndex: 30 },
  scrubberHitbox: { width: "100%", height: "100%", justifyContent: "center" },
  scrubberTrack: { width: "100%", height: 3, backgroundColor: "rgba(255,255,255,0.3)" },
  scrubberFill: { height: "100%", backgroundColor: "#FFFFFF" },
  scrubberThumb: { position: "absolute", width: 12, height: 12, borderRadius: 6, backgroundColor: "#FFFFFF", top: -4.5, marginLeft: -6 },

  // Video Controls
  videoControlsContainer: { position: "absolute", bottom: 20, left: 0, right: 0, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 15, zIndex: 40 },
  muteButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", alignItems: "center" },
  videoTimeText: { fontFamily: "Archivo-Medium", fontSize: 12, color: "#FFFFFF", textShadowColor: "rgba(0,0,0,0.5)", textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
});