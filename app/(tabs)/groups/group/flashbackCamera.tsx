/**
 * Cámara Flashback
 * Captura fotos durante una fiesta flashback con la cámara del dispositivo.
 */
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSnackbar } from "@/components/ui/SnackbarContext";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { supabase } from "@/lib/supabase";
import { flashbackService } from "@/services/flashback.service";
import { Image } from "expo-image";
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
  const { id, partyId } = useLocalSearchParams<{
    id: string;
    partyId: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  const { showSnackbar } = useSnackbar();

  const cameraRef = useRef<CameraView>(null);
  const mountedRef = useRef(true);
  const isTakingRef = useRef(false);
  const remainingRef = useRef(0);
  const cameraReadyRef = useRef(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [flashEnabled, setFlashEnabled] = useState(false);
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [isTaking, setIsTaking] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const [photoLimit, setPhotoLimit] = useState(36);
  const [activityFeed, setActivityFeed] = useState<
    {
      user_name: string;
      avatar_url: string | null;
      taken_at: string;
      photo_url?: string;
    }[]
  >([]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const flashOpacity = useSharedValue(0);
  const flashStyle = useAnimatedStyle(() => ({
    opacity: flashOpacity.value,
  }));

  const counterScale = useSharedValue(1);
  const counterStyle = useAnimatedStyle(() => ({
    transform: [{ scale: counterScale.value }],
  }));

  const loadData = useCallback(async () => {
    if (!partyId || !id) return;
    if (isTakingRef.current) return;
    try {
      const [remainingShots, feed, partyData] = await Promise.all([
        flashbackService.getRemainingShots(partyId),
        flashbackService.getActivityFeed(partyId, id),
        flashbackService.getPartyById(partyId),
      ]);
      if (!mountedRef.current || isTakingRef.current) return;
      setRemaining(remainingShots);
      remainingRef.current = remainingShots;
      setActivityFeed(feed);

      if (partyData) {
        setPhotoLimit(partyData.photo_limit);
        if (partyData.status !== "active") {
          router.replace({
            pathname: "/groups/group/flashback",
            params: { id },
          } as any);
          return;
        }
      }

      if (remainingShots <= 0) {
        router.replace({
          pathname: "/groups/group/flashback",
          params: { id },
        } as any);
      }
    } catch {}
  }, [partyId, id]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  useEffect(() => {
    if (!partyId) return;

    const photosSubscription = supabase
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
        },
      )
      .subscribe();

    const partySubscription = supabase
      .channel(`flashback-party-status-${partyId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "flashback_parties",
          filter: `id=eq.${partyId}`,
        },
        () => {
          loadData();
        },
      )
      .subscribe();

    return () => {
      photosSubscription.unsubscribe();
      partySubscription.unsubscribe();
    };
  }, [partyId, loadData]);

  const handleTakePhoto = async () => {
    if (
      isTakingRef.current ||
      !cameraRef.current ||
      !cameraReadyRef.current ||
      remainingRef.current <= 0
    )
      return;

    isTakingRef.current = true;
    setIsTaking(true);

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      flashOpacity.value = withSequence(
        withTiming(1, { duration: 50 }),
        withTiming(0, { duration: 200 }),
      );

      const camera = cameraRef.current;
      let photo;
      try {
        photo = await camera.takePictureAsync({ quality: 0.7 });
      } catch {
        if (mountedRef.current)
          showSnackbar("Error al capturar la foto", "error");
        return;
      }

      if (!photo?.uri) {
        if (mountedRef.current)
          showSnackbar("No se pudo capturar la foto", "error");
        return;
      }

      counterScale.value = withSequence(
        withTiming(1.3, { duration: 100 }),
        withTiming(1, { duration: 150 }),
      );

      try {
        await flashbackService.takePhoto(partyId!, photo.uri);
      } catch (uploadError: any) {
        if (!mountedRef.current) return;

        let msg = "Error al subir la foto";
        let shouldRedirect = false;

        if (uploadError?.message?.includes("Film is used up")) {
          msg = "Se ha terminado el carrete";
          shouldRedirect = true;
        } else if (uploadError?.message?.includes("Party is not active")) {
          msg = "La fiesta ha terminado";
          shouldRedirect = true;
        }

        showSnackbar(msg, "error");

        if (shouldRedirect) {
          setTimeout(() => {
            if (mountedRef.current) {
              router.replace({
                pathname: "/groups/group/flashback",
                params: { id },
              } as any);
            }
          }, 1500);
        }
        return;
      }

      if (!mountedRef.current) return;

      const newRemaining = remainingRef.current - 1;
      remainingRef.current = newRemaining;
      setRemaining(newRemaining);

      if (newRemaining <= 0) {
        router.replace({
          pathname: "/groups/group/flashback",
          params: { id },
        } as any);
      }
    } catch {
      if (mountedRef.current) showSnackbar("Error inesperado", "error");
    } finally {
      isTakingRef.current = false;
      if (mountedRef.current) setIsTaking(false);
      setTimeout(() => {
        if (mountedRef.current) loadData();
      }, 500);
    }
  };

  if (!permission?.granted) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, { backgroundColor: "#0A0A0A" }]}>
          <View
            style={[
              styles.permissionContainer,
              { paddingTop: insets.top + 60 },
            ]}
          >
            <Ionicons name="camera-outline" size={64} color="#FFFFFF" />
            <Text style={styles.permissionTitle}>Acceso a la cámara</Text>
            <Text style={styles.permissionText}>
              Necesitamos acceso a tu cámara para disparar fotos
            </Text>
            <Pressable
              onPress={requestPermission}
              style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
            >
              <View
                style={[
                  styles.permissionButton,
                  { backgroundColor: theme.colors.primary },
                ]}
              >
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
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          flash={flashEnabled ? "on" : "off"}
          onCameraReady={() => {
            cameraReadyRef.current = true;
          }}
        >
          <Animated.View
            style={[
              StyleSheet.absoluteFillObject,
              { backgroundColor: "#FFFFFF" },
              flashStyle,
            ]}
            pointerEvents="none"
          />
        </CameraView>

        <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={28} color="#FFFFFF" />
          </Pressable>

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

        <View
          style={[styles.bottomSection, { paddingBottom: insets.bottom + 16 }]}
        >
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
                    {item.photo_url ? (
                      <>
                        <Image
                          source={{ uri: item.photo_url }}
                          style={StyleSheet.absoluteFill}
                          contentFit="cover"
                          blurRadius={8}
                          transition={200}
                        />
                        <View style={{ flex: 1 }} />
                      </>
                    ) : (
                      <View style={styles.feedBlurPlaceholder}>
                        <Ionicons
                          name="image"
                          size={20}
                          color="rgba(255,255,255,0.15)"
                        />
                      </View>
                    )}
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

          <View style={styles.shutterRow}>
            <View style={{ width: 44 }} />

            <Pressable
              onPress={handleTakePhoto}
              disabled={isTaking || remaining <= 0}
              style={({ pressed }) => [
                styles.shutterButton,
                {
                  opacity:
                    isTaking || remaining <= 0 ? 0.4 : pressed ? 0.85 : 1,
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

            <Pressable
              onPress={() => {
                setFacing((prev) => (prev === "back" ? "front" : "back"));
                Haptics.selectionAsync();
              }}
              style={({ pressed }) => [
                styles.flipButton,
                { opacity: pressed ? 0.7 : 1 },
              ]}
              hitSlop={12}
            >
              <Ionicons
                name="camera-reverse-outline"
                size={26}
                color="#FFFFFF"
              />
            </Pressable>
          </View>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  camera: { flex: 1 },

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

  shutterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 40,
    paddingVertical: 8,
  },
  flipButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },
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
