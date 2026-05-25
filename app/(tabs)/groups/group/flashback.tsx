import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Text, useTheme } from "react-native-paper";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomSheetModal } from "../../../../components/ui/BottomSheetModal";
import { CustomHeader } from "../../../../components/ui/CustomHeader";
import { useSnackbar } from "@/components/ui/SnackbarContext";
import { flashbackService } from "@/services/flashback.service";
import {
  FlashbackPartyStatus,
  FlashbackPartyWithDetails,
} from "@/types/database";

// ─── Countdown helper ─────────────────────────────────────────────────
function useCountdown(targetDate: string | null) {
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    if (!targetDate) return;
    const tick = () => {
      const diff = Math.max(0, new Date(targetDate).getTime() - Date.now());
      setTimeLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return timeLeft;
}

function formatCountdown(t: { d: number; h: number; m: number; s: number }) {
  if (t.d > 0) return `${t.d}d ${t.h}h ${t.m}m`;
  if (t.h > 0) return `${t.h}h ${t.m}m ${t.s}s`;
  return `${t.m}m ${t.s}s`;
}

// ─── Main Screen ──────────────────────────────────────────────────────
export default function FlashbackScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();

  const [party, setParty] = useState<FlashbackPartyWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadParty = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const active = await flashbackService.getActiveParty(id);
      setParty(active);
    } catch (e) {
      console.error("Error loading flashback party:", e);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadParty();
    }, [loadParty])
  );

  // Auto-redirect based on status
  useEffect(() => {
    if (!party || isLoading) return;

    if (party.status === "active") {
      router.replace({
        pathname: "/groups/group/flashbackCamera",
        params: { id, partyId: party.id },
      } as any);
    } else if (party.status === "revealing") {
      router.replace({
        pathname: "/groups/group/flashbackParty",
        params: { id, partyId: party.id },
      } as any);
    }
  }, [party, isLoading, router, id]);

  const status = party?.status ?? null;
  const startsCountdown = useCountdown(
    status === "scheduled" ? party!.starts_at : null
  );
  const revealsCountdown = useCountdown(
    status === "film_used" ? party!.reveals_at : null
  );

  const handleViewArchive = () => {
    router.push({
      pathname: "/groups/group/flashbackParty",
      params: { id, archive: "true" },
    } as any);
  };

  // ─── Loading ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <CustomHeader title="Flashback" showBackButton />
          <View style={styles.centerContent}>
            <Animated.View entering={FadeIn.duration(300)}>
              <SquircleView
                style={[
                  styles.skeletonIcon,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
                cornerSmoothing={1}
              />
            </Animated.View>
          </View>
        </View>
      </>
    );
  }

  // ─── Scheduled — countdown to start ─────────────────────────────────
  if (status === "scheduled") {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <CustomHeader title="Flashback" showBackButton />
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View entering={FadeInDown.duration(500)} style={styles.centerContent}>
              <SquircleView
                style={[styles.iconBadgeLarge, { backgroundColor: theme.colors.surfaceVariant }]}
                cornerSmoothing={1}
              >
                <Ionicons name="time-outline" size={48} color={theme.colors.primary} />
              </SquircleView>

              <Text style={[styles.title, { color: theme.colors.onSurface }]}>
                {party!.name}
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                La fiesta empieza en
              </Text>

              <SquircleView
                style={[
                  styles.countdownCard,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant, borderWidth: 1 },
                ]}
                cornerSmoothing={1}
              >
                <Text style={[styles.countdownText, { color: theme.colors.primary }]}>
                  {formatCountdown(startsCountdown)}
                </Text>
              </SquircleView>

              <Text style={[styles.hint, { color: theme.colors.onSurfaceVariant }]}>
                {party!.photo_limit} fotos · Revelación después de la fiesta
              </Text>
            </Animated.View>

            <Pressable onPress={handleViewArchive} style={styles.archiveLink}>
              <Text style={[styles.archiveLinkText, { color: theme.colors.primary }]}>
                Ver archivo
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </>
    );
  }

  // ─── Film used — countdown to reveal ────────────────────────────────
  if (status === "film_used") {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <CustomHeader title="Flashback" showBackButton />
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View entering={FadeInDown.duration(500)} style={styles.centerContent}>
              <SquircleView
                style={[styles.iconBadgeLarge, { backgroundColor: theme.colors.surfaceVariant }]}
                cornerSmoothing={1}
              >
                <Ionicons name="film-outline" size={48} color={theme.colors.onSurfaceVariant} />
              </SquircleView>

              <Text style={[styles.title, { color: theme.colors.onSurface }]}>
                Carrete agotado
              </Text>
              <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
                ¡Se acabaron las {party!.photo_limit} fotos! Las fotos se revelan en
              </Text>

              <SquircleView
                style={[
                  styles.countdownCard,
                  { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant, borderWidth: 1 },
                ]}
                cornerSmoothing={1}
              >
                <Text style={[styles.countdownText, { color: theme.colors.primary }]}>
                  {formatCountdown(revealsCountdown)}
                </Text>
              </SquircleView>
            </Animated.View>
          </ScrollView>
        </View>
      </>
    );
  }

  // ─── Empty state (no party or archived) ─────────────────────────────
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <CustomHeader title="Flashback" showBackButton />
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(500).delay(100)} style={styles.centerContent}>
            <SquircleView
              style={[styles.iconBadgeLarge, { backgroundColor: theme.colors.surfaceVariant }]}
              cornerSmoothing={1}
            >
              <Ionicons name="camera-outline" size={48} color={theme.colors.primary} />
            </SquircleView>

            <Text style={[styles.title, { color: theme.colors.onSurface }]}>
              No hay ninguna fiesta creada
            </Text>
            <Text style={[styles.subtitle, { color: theme.colors.onSurfaceVariant }]}>
              Crea una fiesta y revive la noche al día siguiente
            </Text>

            <Pressable
              onPress={() => setShowCreateModal(true)}
              style={({ pressed }) => [{ opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
            >
              <SquircleView
                style={[styles.ctaButton, { backgroundColor: theme.colors.primary }]}
                cornerSmoothing={1}
              >
                <Ionicons name="add" size={20} color={theme.colors.onPrimary} />
                <Text style={[styles.ctaText, { color: theme.colors.onPrimary }]}>
                  Crear fiesta
                </Text>
              </SquircleView>
            </Pressable>
          </Animated.View>

          <Pressable onPress={handleViewArchive} style={styles.archiveLink}>
            <Text style={[styles.archiveLinkText, { color: theme.colors.primary }]}>
              Ver archivo
            </Text>
          </Pressable>
        </ScrollView>

        <CreatePartyModal
          visible={showCreateModal}
          onDismiss={() => setShowCreateModal(false)}
          groupId={id!}
          onCreated={loadParty}
        />
      </View>
    </>
  );
}

// ─── Create Party Modal ───────────────────────────────────────────────
interface CreatePartyModalProps {
  visible: boolean;
  onDismiss: () => void;
  groupId: string;
  onCreated: () => void;
}

function CreatePartyModal({ visible, onDismiss, groupId, onCreated }: CreatePartyModalProps) {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();

  const [name, setName] = useState("");
  const [startsAt, setStartsAt] = useState(new Date());
  const [revealsAt, setRevealsAt] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 6);
    return d;
  });
  const [photoLimit, setPhotoLimit] = useState<24 | 36>(36);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [showStartPicker, setShowStartPicker] = useState(Platform.OS === "ios");
  const [showRevealPicker, setShowRevealPicker] = useState(Platform.OS === "ios");

  const handleCreate = async () => {
    if (!name.trim()) {
      showSnackbar("Pon un nombre a la fiesta", "info");
      return;
    }
    if (revealsAt <= startsAt) {
      showSnackbar("La revelación debe ser después del inicio", "info");
      return;
    }

    try {
      setIsSubmitting(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await flashbackService.createParty({
        group_id: groupId,
        name: name.trim(),
        starts_at: startsAt.toISOString(),
        reveals_at: revealsAt.toISOString(),
        photo_limit: photoLimit,
      });
      showSnackbar("¡Fiesta creada!", "success");
      onDismiss();
      onCreated();
      setName("");
    } catch (e) {
      console.error("Error creating party:", e);
      showSnackbar("Error al crear la fiesta", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDateTime = (d: Date) => {
    return d.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <BottomSheetModal visible={visible} onDismiss={onDismiss}>
      <View style={styles.modalContent}>
        <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>
          Crear fiesta
        </Text>

        {/* Name */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: theme.colors.onSurfaceVariant }]}>
            Nombre de la fiesta
          </Text>
          <SquircleView
            style={[
              styles.inputContainer,
              { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant, borderWidth: 1 },
            ]}
            cornerSmoothing={1}
          >
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Noche de verano..."
              placeholderTextColor={theme.colors.outline}
              style={[styles.textInput, { color: theme.colors.onSurface }]}
              maxLength={60}
            />
          </SquircleView>
        </View>

        {/* Start time */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: theme.colors.onSurfaceVariant }]}>
            Hora de inicio
          </Text>
          {Platform.OS === "android" && (
            <Pressable onPress={() => setShowStartPicker(true)}>
              <SquircleView
                style={[
                  styles.dateButton,
                  { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant, borderWidth: 1 },
                ]}
                cornerSmoothing={1}
              >
                <Ionicons name="time-outline" size={18} color={theme.colors.primary} />
                <Text style={[styles.dateButtonText, { color: theme.colors.onSurface }]}>
                  {formatDateTime(startsAt)}
                </Text>
              </SquircleView>
            </Pressable>
          )}
          {showStartPicker && (
            <DateTimePicker
              value={startsAt}
              mode="datetime"
              display={Platform.OS === "ios" ? "compact" : "default"}
              onChange={(_, date) => {
                if (Platform.OS === "android") setShowStartPicker(false);
                if (date) setStartsAt(date);
              }}
              minimumDate={new Date()}
              locale="es-ES"
            />
          )}
        </View>

        {/* Reveal time */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: theme.colors.onSurfaceVariant }]}>
            Hora de revelación
          </Text>
          {Platform.OS === "android" && (
            <Pressable onPress={() => setShowRevealPicker(true)}>
              <SquircleView
                style={[
                  styles.dateButton,
                  { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant, borderWidth: 1 },
                ]}
                cornerSmoothing={1}
              >
                <Ionicons name="eye-outline" size={18} color={theme.colors.primary} />
                <Text style={[styles.dateButtonText, { color: theme.colors.onSurface }]}>
                  {formatDateTime(revealsAt)}
                </Text>
              </SquircleView>
            </Pressable>
          )}
          {showRevealPicker && (
            <DateTimePicker
              value={revealsAt}
              mode="datetime"
              display={Platform.OS === "ios" ? "compact" : "default"}
              onChange={(_, date) => {
                if (Platform.OS === "android") setShowRevealPicker(false);
                if (date) setRevealsAt(date);
              }}
              minimumDate={startsAt}
              locale="es-ES"
            />
          )}
        </View>

        {/* Photo limit toggle */}
        <View style={styles.fieldGroup}>
          <Text style={[styles.fieldLabel, { color: theme.colors.onSurfaceVariant }]}>
            Fotos del carrete
          </Text>
          <View style={styles.limitToggleRow}>
            {([24, 36] as const).map((limit) => (
              <Pressable
                key={limit}
                onPress={() => {
                  setPhotoLimit(limit);
                  Haptics.selectionAsync();
                }}
              >
                <SquircleView
                  style={[
                    styles.limitOption,
                    {
                      backgroundColor:
                        photoLimit === limit
                          ? theme.colors.primary
                          : theme.colors.surfaceVariant,
                      borderColor:
                        photoLimit === limit
                          ? theme.colors.primary
                          : theme.colors.outlineVariant,
                      borderWidth: 1,
                    },
                  ]}
                  cornerSmoothing={1}
                >
                  <Text
                    style={[
                      styles.limitOptionText,
                      {
                        color:
                          photoLimit === limit
                            ? theme.colors.onPrimary
                            : theme.colors.onSurface,
                      },
                    ]}
                  >
                    {limit} fotos
                  </Text>
                </SquircleView>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Create button */}
        <Pressable
          onPress={handleCreate}
          disabled={isSubmitting}
          style={({ pressed }) => [{ opacity: pressed || isSubmitting ? 0.7 : 1 }]}
        >
          <SquircleView
            style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
            cornerSmoothing={1}
          >
            <Ionicons name="sparkles" size={18} color={theme.colors.onPrimary} />
            <Text style={[styles.createButtonText, { color: theme.colors.onPrimary }]}>
              {isSubmitting ? "Creando..." : "Crear fiesta"}
            </Text>
          </SquircleView>
        </Pressable>
      </View>
    </BottomSheetModal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingTop: 16 },
  centerContent: { alignItems: "center", marginTop: 60, gap: 12 },

  iconBadgeLarge: {
    width: 96,
    height: 96,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  skeletonIcon: {
    width: 96,
    height: 96,
    borderRadius: 28,
  },

  title: {
    fontFamily: "Archivo-Bold",
    fontSize: 22,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "Archivo-Medium",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  hint: {
    fontFamily: "Archivo-Medium",
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
  },

  countdownCard: {
    paddingVertical: 20,
    paddingHorizontal: 36,
    borderRadius: 20,
    marginTop: 8,
  },
  countdownText: {
    fontFamily: "Archivo-Bold",
    fontSize: 32,
    letterSpacing: 2,
    textAlign: "center",
  },

  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 18,
    marginTop: 8,
  },
  ctaText: {
    fontFamily: "Archivo-Bold",
    fontSize: 16,
    letterSpacing: 0.3,
  },

  archiveLink: {
    alignItems: "center",
    paddingVertical: 24,
  },
  archiveLinkText: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 14,
  },

  // Modal
  modalContent: { paddingHorizontal: 24, paddingBottom: 20, gap: 16 },
  modalTitle: {
    fontFamily: "Archivo-Bold",
    fontSize: 22,
    textAlign: "center",
    marginBottom: 4,
  },
  fieldGroup: { gap: 6 },
  fieldLabel: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 13,
    letterSpacing: 0.3,
  },
  inputContainer: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 2 },
  textInput: {
    fontFamily: "Archivo-Medium",
    fontSize: 15,
    paddingVertical: 12,
  },
  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
  },
  dateButtonText: { fontFamily: "Archivo-Medium", fontSize: 14 },

  limitToggleRow: { flexDirection: "row", gap: 10 },
  limitOption: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  limitOptionText: { fontFamily: "Archivo-SemiBold", fontSize: 14 },

  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 18,
    marginTop: 4,
  },
  createButtonText: {
    fontFamily: "Archivo-Bold",
    fontSize: 16,
    letterSpacing: 0.3,
  },
});
