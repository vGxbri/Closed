import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Text, useTheme } from "react-native-paper";
import Animated, { FadeIn, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CustomHeader } from "../../../../components/ui/CustomHeader";
import { flashbackService } from "@/services/flashback.service";
import {
  FlashbackPartyWithDetails,
  FlashbackPhotoWithUser,
} from "@/types/database";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_GAP = 4;
const COLS = 3;
const PHOTO_SIZE = (SCREEN_WIDTH - 24 * 2 - GRID_GAP * (COLS - 1)) / COLS;

export default function FlashbackPartyScreen() {
  const { id, partyId, archive } = useLocalSearchParams<{
    id: string;
    partyId?: string;
    archive?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const isArchiveMode = archive === "true";

  const [party, setParty] = useState<FlashbackPartyWithDetails | null>(null);
  const [photos, setPhotos] = useState<FlashbackPhotoWithUser[]>([]);
  const [archivedParties, setArchivedParties] = useState<FlashbackPartyWithDetails[]>([]);
  const [selectedArchiveParty, setSelectedArchiveParty] = useState<string | null>(
    partyId || null
  );
  const [isLoading, setIsLoading] = useState(true);

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

  const loadArchive = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const archived = await flashbackService.getPartyArchive(id);
      setArchivedParties(archived);
      if (archived.length > 0 && !selectedArchiveParty) {
        setSelectedArchiveParty(archived[0].id);
        await loadPartyData(archived[0].id);
      }
    } catch (e) {
      console.error("Error loading archive:", e);
    } finally {
      setIsLoading(false);
    }
  }, [id, selectedArchiveParty, loadPartyData]);

  useFocusEffect(
    useCallback(() => {
      if (isArchiveMode) {
        loadArchive();
      } else if (partyId) {
        setIsLoading(true);
        loadPartyData(partyId).finally(() => setIsLoading(false));
      }
    }, [isArchiveMode, partyId, loadArchive, loadPartyData])
  );

  const handleSelectArchiveParty = async (pId: string) => {
    setSelectedArchiveParty(pId);
    setIsLoading(true);
    await loadPartyData(pId);
    setIsLoading(false);
  };

  const uniquePhotographers = new Set(photos.map((p) => p.taken_by)).size;

  const headerTitle = isArchiveMode ? "Archivo" : party?.name || "Flashback";

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <CustomHeader title={headerTitle} showBackButton />

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Archive party selector */}
          {isArchiveMode && archivedParties.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.archiveSelector}
              style={styles.archiveSelectorScroll}
            >
              {archivedParties.map((ap) => (
                <Pressable
                  key={ap.id}
                  onPress={() => handleSelectArchiveParty(ap.id)}
                >
                  <SquircleView
                    style={[
                      styles.archiveChip,
                      {
                        backgroundColor:
                          selectedArchiveParty === ap.id
                            ? theme.colors.primary
                            : theme.colors.surfaceVariant,
                        borderColor:
                          selectedArchiveParty === ap.id
                            ? theme.colors.primary
                            : theme.colors.outlineVariant,
                        borderWidth: 1,
                      },
                    ]}
                    cornerSmoothing={1}
                  >
                    <Text
                      style={[
                        styles.archiveChipText,
                        {
                          color:
                            selectedArchiveParty === ap.id
                              ? theme.colors.onPrimary
                              : theme.colors.onSurface,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {ap.name}
                    </Text>
                    <Text
                      style={[
                        styles.archiveChipCount,
                        {
                          color:
                            selectedArchiveParty === ap.id
                              ? theme.colors.onPrimary
                              : theme.colors.onSurfaceVariant,
                        },
                      ]}
                    >
                      {ap.photos_count} fotos
                    </Text>
                  </SquircleView>
                </Pressable>
              ))}
            </ScrollView>
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
                    isArchiveMode ? 0 : Math.min(index * 80, 1500)
                  )}
                  style={styles.photoWrapper}
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
                      transition={isArchiveMode ? 200 : 600}
                    />
                    {/* Photo info overlay */}
                    <View style={styles.photoOverlay}>
                      <Text style={styles.photoUser} numberOfLines={1}>
                        {photo.user?.display_name || "Anónimo"}
                      </Text>
                    </View>
                  </SquircleView>
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
                {isArchiveMode
                  ? "No hay fiestas archivadas"
                  : "Aún no hay fotos"}
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
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 8 },

  // Archive selector
  archiveSelectorScroll: { marginBottom: 16, marginHorizontal: -24 },
  archiveSelector: { paddingHorizontal: 24, gap: 8 },
  archiveChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  archiveChipText: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 13,
  },
  archiveChipCount: {
    fontFamily: "Archivo-Medium",
    fontSize: 11,
    marginTop: 1,
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
});
