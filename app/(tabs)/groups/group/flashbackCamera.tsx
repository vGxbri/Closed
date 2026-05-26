import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Text, useTheme } from "react-native-paper";
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { UserAvatar } from "@/components/ui/UserAvatar";
import { flashbackService } from "@/services/flashback.service";
import { supabase } from "@/lib/supabase";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "ahora";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `hace ${hours}h`;
  return `hace ${Math.floor(hours / 24)}d`;
}

export default function FlashbackCameraScreen() {
  const { id, partyId } = useLocalSearchParams<{ id: string; partyId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [isTaking, setIsTaking] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [photoLimit, setPhotoLimit] = useState(36);
  const [activityFeed, setActivityFeed] = useState<
    { user_name: string; avatar_url: string | null; taken_at: string }[]
  >([]);

  // Flash overlay animation
  const flashOpacity = useSharedValue(0);
  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  // Counter scale animation
  const counterScale = useSharedValue(1);
  const counterStyle = useAnimatedStyle(() => ({
    transform: [{ scale: counterScale.value }],
  }));

  const loadData = useCallback(async () => {
    if (!partyId) return;
    try {
      const [remainingShots, feed, partyData] = await Promise.all([
        flashbackService.getRemainingShots(partyId),
        flashbackService.getActivityFeed(partyId),
        flashbackService.getPartyById(partyId),
      ]);
      setRemaining(remainingShots);
      setActivityFeed(feed);
      if (partyData) setPhotoLimit(partyData.photo_limit);
    } catch (e) {
      console.error("Error loading camera data:", e);
    }
  }, [partyId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Realtime subscription for activity feed
  useEffect(() => {
    if (!partyId) return;
    const subscription = supabase
      .channel(`flashback-photos-${partyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "flashback_photos",
          filter: `party_id=eq.${partyId}`,
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [partyId, loadData]);

  const handleTakePhoto = async () => {
    if (isTaking || !cameraRef.current || remaining <= 0) return;

    try {
      setIsTaking(true);

      // Flash + haptics
      flashOpacity.value = withSequence(
        withTiming(1, { duration: 50 }),
        withTiming(0, { duration: 200 })
      );
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        skipProcessing: true,
      });

      if (!photo?.uri) throw new Error("No photo captured");

      // Counter animation
      counterScale.value = withSequence(
        withTiming(1.3, { duration: 100 }),
        withTiming(1, { duration: 150 })
      );

      await flashbackService.takePhoto(partyId!, photo.uri);

      setRemaining((prev) => Math.max(0, prev - 1));

      if (remaining <= 1) {
        router.replace({
          pathname: "/groups/group/flashback",
          params: { id },
        } as any);
      }
    } catch (e) {
      console.error("Error taking photo:", e);
    } finally {
      setIsTaking(false);
    }
  };

  // ─── Permission denied ──────────────────────────────────────────────
  if (!permission?.granted) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, { backgroundColor: "#0A0A0A" }]}>
          <View style={[styles.permissionContainer, { paddingTop: insets.top + 60 }]}>
            <Ionicons name="camera-outline" size={64} color="#FFFFFF" />
            <Text style={styles.permissionTitle}>Acceso a la cámara</Text>
            <Text style={styles.permissionText}>
              Necesitamos acceso a tu cámara para disparar fotos
            </Text>
            <Pressable
              onPress={requestPermission}
              style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
            >
              <View style={[styles.permissionButton, { backgroundColor: theme.colors.primary }]}>
                <Text style={styles.permissionButtonText}>Permitir cámara</Text>
              </View>
            </Pressable>
            <Pressable onPress={() => router.back()}>
              <Text style={styles.permissionBack}>Volver</Text>
            </Pressable>
          </View>
        </View>
      </>
    );
  }

  const shotsTaken = photoLimit - remaining;

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: "#0A0A0A" }]}>
        {/* Camera */}
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          flash={flashEnabled ? "on" : "off"}
        >
          {/* Flash overlay */}
          <Animated.View
            style={[StyleSheet.absoluteFillObject, { backgroundColor: "#FFFFFF" }, flashStyle]}
            pointerEvents="none"
          />
        </CameraView>

        {/* Top bar */}
        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </Pressable>

          {/* Shot counter (LCD style) */}
          <Animated.View style={counterStyle}>
            <View style={styles.counterContainer}>
              <Text style={styles.counterText}>
                {shotsTaken}/{photoLimit}
              </Text>
            </View>
          </Animated.View>

          <Pressable
            onPress={() => {
              setFlashEnabled((prev) => !prev);
              Haptics.selectionAsync();
            }}
            hitSlop={12}
          >
            <Ionicons
              name={flashEnabled ? "flash" : "flash-off"}
              size={24}
              color={flashEnabled ? "#FFD700" : "#FFFFFF60"}
            />
          </Pressable>
        </View>

        {/* Bottom section */}
        <View style={[styles.bottomSection, { paddingBottom: insets.bottom + 16 }]}>
          {/* Activity feed (blind) */}
          {activityFeed.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.feedContainer}
              style={styles.feedScroll}
            >
              {activityFeed.slice(0, 10).map((item, index) => (
                <Animated.View
                  key={`${item.taken_at}-${index}`}
                  entering={FadeIn.duration(300).delay(index * 50)}
                >
                  <View style={styles.feedCard}>
                    <View style={styles.feedBlurPlaceholder}>
                      <Ionicons name="image" size={20} color="rgba(255,255,255,0.15)" />
                    </View>
                    <View style={styles.feedCardInfo}>
                      <UserAvatar
                        uri={item.avatar_url}
                        name={item.user_name}
                        size={22}
                        borderRadius={7}
                      />
                      <View style={styles.feedCardTextBlock}>
                        <Text style={styles.feedCardName} numberOfLines={1}>
                          {item.user_name}
                        </Text>
                        <Text style={styles.feedCardTime} numberOfLines={1}>
                          {timeAgo(item.taken_at)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </Animated.View>
              ))}
            </ScrollView>
          )}

          {/* Shutter button */}
          <View style={styles.shutterRow}>
            <Pressable
              onPress={handleTakePhoto}
              disabled={isTaking || remaining <= 0}
              style={({ pressed }) => [
                styles.shutterButton,
                {
                  opacity: isTaking || remaining <= 0 ? 0.4 : pressed ? 0.85 : 1,
                  transform: [{ scale: pressed && !isTaking ? 0.92 : 1 }],
                },
              ]}
            >
              <View
                style={[
                  styles.shutterInner,
                  { backgroundColor: theme.colors.primary },
                ]}
              />
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },

  // Top bar
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
    backgroundColor: "rgba(0,0,0,0.3)",
  },

  counterContainer: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  counterText: {
    fontFamily: "Archivo-Bold",
    fontSize: 18,
    color: "#FFFFFF",
    letterSpacing: 3,
  },

  // Bottom
  bottomSection: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingTop: 12,
  },

  feedScroll: { maxHeight: 90, marginBottom: 16 },
  feedContainer: { paddingHorizontal: 16, gap: 10 },
  feedCard: {
    width: 140,
    height: 80,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  feedBlurPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  feedCardInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  feedCardTextBlock: { flex: 1 },
  feedCardName: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 11,
    color: "#FFFFFF",
  },
  feedCardTime: {
    fontFamily: "Archivo-Medium",
    fontSize: 9,
    color: "rgba(255,255,255,0.6)",
  },

  // Shutter
  shutterRow: { alignItems: "center", paddingVertical: 8 },
  shutterButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  shutterInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },

  // Permission
  permissionContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    gap: 16,
  },
  permissionTitle: {
    fontFamily: "Archivo-Bold",
    fontSize: 22,
    color: "#FFFFFF",
    marginTop: 8,
  },
  permissionText: {
    fontFamily: "Archivo-Medium",
    fontSize: 15,
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    lineHeight: 22,
  },
  permissionButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
    marginTop: 8,
  },
  permissionButtonText: {
    fontFamily: "Archivo-Bold",
    fontSize: 16,
    color: "#FFFFFF",
  },
  permissionBack: {
    fontFamily: "Archivo-Medium",
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginTop: 8,
  },
});
