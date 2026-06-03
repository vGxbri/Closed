import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
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
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSnackbar } from "@/components/ui/SnackbarContext";
import { useGroup } from "@/hooks";
import { flashbackService } from "@/services/flashback.service";
import { FlashbackPartyWithDetails } from "@/types/database";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { CustomHeader } from "@/components/ui/CustomHeader";

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
  const { group, isAdmin } = useGroup(id);

  const canCreateParty =
    isAdmin || (group?.settings?.allow_member_create_flashback_party ?? true);

  const [party, setParty] = useState<FlashbackPartyWithDetails | null>(null);
  const [archivedParties, setArchivedParties] = useState<
    FlashbackPartyWithDetails[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showArchiveSheet, setShowArchiveSheet] = useState(false);

  const loadParty = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const [active, archived] = await Promise.all([
        flashbackService.getActiveParty(id),
        flashbackService.getPartyArchive(id),
      ]);
      setParty(active);
      setArchivedParties(archived);
    } catch (e) {
      console.error("Error loading flashback party:", e);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadParty();
    }, [loadParty]),
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
    status === "scheduled" ? party!.starts_at : null,
  );
  const revealsCountdown = useCountdown(
    status === "film_used" ? party!.reveals_at : null,
  );

  const handleOpenParty = (partyId: string) => {
    router.push({
      pathname: "/groups/group/flashbackParty",
      params: { id, partyId },
    } as any);
  };

  const formatPartyDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // ─── Combined list: current party + archived ─────────────────────────
  const allParties = (() => {
    const list: FlashbackPartyWithDetails[] = [];
    if (party) list.push(party);
    for (const ap of archivedParties) {
      if (!party || ap.id !== party.id) list.push(ap);
    }
    return list;
  })();

  // ─── Flashback selector button (top of screen) ──────────────────────
  const selectorButton = allParties.length > 0 && (
    <Pressable
      onPress={() => setShowArchiveSheet(true)}
      style={({ pressed }) => [
        {
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.98 : 1 }],
          marginBottom: 12,
        },
      ]}
    >
      <SquircleView
        style={[
          styles.selectorButton,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.outlineVariant,
            borderWidth: 1,
          },
        ]}
        cornerSmoothing={1}
      >
        <Ionicons
          name="swap-horizontal-outline"
          size={16}
          color={theme.colors.onSurfaceVariant}
        />
        <Text
          style={[
            styles.selectorButtonText,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          {party?.name ?? "Cambiar flashback"}
        </Text>
        <Ionicons
          name="chevron-down"
          size={14}
          color={theme.colors.onSurfaceVariant}
        />
      </SquircleView>
    </Pressable>
  );

  // ─── Archive modal ───────────────────────────────────────────────────
  const archiveModal = (
    <BottomSheetModal
      visible={showArchiveSheet}
      onDismiss={() => setShowArchiveSheet(false)}
    >
      <View style={styles.archiveSheetContent}>
        <Text
          style={[styles.archiveSheetTitle, { color: theme.colors.onSurface }]}
        >
          Flashbacks
        </Text>
        <ScrollView
          style={styles.archiveSheetScroll}
          showsVerticalScrollIndicator={false}
        >
          {allParties.map((ap) => {
            const isCurrent = party?.id === ap.id;
            return (
              <Pressable
                key={ap.id}
                onPress={() => {
                  if (!isCurrent) {
                    setShowArchiveSheet(false);
                    handleOpenParty(ap.id);
                  }
                }}
                style={({ pressed }) => [
                  styles.archiveSheetRow,
                  {
                    backgroundColor: isCurrent
                      ? theme.colors.primaryContainer
                      : pressed
                        ? theme.colors.surfaceVariant
                        : "transparent",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.archiveSheetName,
                    {
                      color: isCurrent
                        ? theme.colors.onPrimaryContainer
                        : theme.colors.onSurface,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {ap.name}
                </Text>
                <Text
                  style={[
                    styles.archiveSheetMeta,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {formatPartyDate(ap.starts_at)}
                </Text>
                <Text
                  style={[
                    styles.archiveSheetPhotos,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {ap.photos_count} foto{ap.photos_count !== 1 ? "s" : ""}
                </Text>
                {isCurrent ? (
                  <Ionicons
                    name="checkmark"
                    size={16}
                    color={theme.colors.primary}
                  />
                ) : (
                  <Ionicons
                    name="chevron-forward"
                    size={16}
                    color={theme.colors.onSurfaceVariant}
                  />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </BottomSheetModal>
  );

  // ─── Loading ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View
          style={[
            styles.container,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <CustomHeader title="Flashback" showBackButton />
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 40 },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              entering={FadeIn.duration(250)}
              style={styles.titleBlock}
            >
              <View
                style={[
                  styles.skeletonTitle,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
              />
              <View
                style={[
                  styles.skeletonSubtitle,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
              />
            </Animated.View>

            <Animated.View
              entering={FadeIn.duration(250).delay(50)}
              style={[
                styles.divider,
                { backgroundColor: theme.colors.outlineVariant },
              ]}
            />

            <Animated.View entering={FadeInDown.duration(250).delay(80)}>
              <SquircleView
                style={[
                  styles.skeletonSelector,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
                cornerSmoothing={1}
              />
            </Animated.View>

            <Animated.View
              entering={FadeInDown.duration(250).delay(120)}
              style={styles.emptyContainer}
            >
              <SquircleView
                style={[
                  styles.skeletonCard,
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
                    styles.skeletonIcon,
                    { backgroundColor: theme.colors.surfaceVariant },
                  ]}
                  cornerSmoothing={1}
                />
                <View
                  style={[
                    styles.skeletonLineLg,
                    { backgroundColor: theme.colors.surfaceVariant },
                  ]}
                />
                <View
                  style={[
                    styles.skeletonLineMd,
                    { backgroundColor: theme.colors.surfaceVariant },
                  ]}
                />
                <View
                  style={[
                    styles.skeletonLineSm,
                    { backgroundColor: theme.colors.surfaceVariant },
                  ]}
                />
              </SquircleView>
            </Animated.View>
          </ScrollView>
        </View>
      </>
    );
  }

  // ─── Scheduled — countdown to start ─────────────────────────────────
  if (status === "scheduled") {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View
          style={[
            styles.container,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <CustomHeader title="" showBackButton />
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 40 },
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
                Flashback
              </Text>
              <Text
                style={[
                  styles.screenSubtitle,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {party!.name}
              </Text>
            </Animated.View>

            <Animated.View
              entering={FadeIn.duration(400).delay(50)}
              style={[
                styles.divider,
                { backgroundColor: theme.colors.outlineVariant },
              ]}
            />

            {selectorButton}

            {/* ─── Countdown card ─── */}
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
                    name="time-outline"
                    size={36}
                    color={theme.colors.primary}
                  />
                </SquircleView>

                <Text
                  style={[styles.emptyTitle, { color: theme.colors.onSurface }]}
                >
                  El flashback empieza en
                </Text>

                <SquircleView
                  style={[
                    styles.countdownCard,
                    {
                      backgroundColor: theme.dark
                        ? "rgba(42,138,112,0.1)"
                        : "rgba(42,138,112,0.05)",
                      borderColor: theme.colors.outlineVariant,
                      borderWidth: 1,
                    },
                  ]}
                  cornerSmoothing={1}
                >
                  <Text
                    style={[
                      styles.countdownText,
                      { color: theme.colors.primary },
                    ]}
                  >
                    {formatCountdown(startsCountdown)}
                  </Text>
                </SquircleView>

                <Text
                  style={[
                    styles.emptySubtitle,
                    { color: theme.colors.onSurfaceVariant, marginTop: 12 },
                  ]}
                >
                  {party!.photo_limit} fotos · Fin:{" "}
                  {new Date(party!.ends_at).toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  · Revelación:{" "}
                  {new Date(party!.reveals_at).toLocaleTimeString("es-ES", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </SquircleView>
            </Animated.View>
          </ScrollView>
          {archiveModal}
        </View>
      </>
    );
  }

  // ─── Film used — countdown to reveal ────────────────────────────────
  if (status === "film_used") {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View
          style={[
            styles.container,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <CustomHeader title="" showBackButton />
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + 40 },
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
                Flashback
              </Text>
              <Text
                style={[
                  styles.screenSubtitle,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Flashback terminado
              </Text>
            </Animated.View>

            <Animated.View
              entering={FadeIn.duration(400).delay(50)}
              style={[
                styles.divider,
                { backgroundColor: theme.colors.outlineVariant },
              ]}
            />

            {selectorButton}

            {/* ─── Countdown card ─── */}
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
                    name="film-outline"
                    size={36}
                    color={theme.colors.primary}
                  />
                </SquircleView>

                <Text
                  style={[styles.emptyTitle, { color: theme.colors.onSurface }]}
                >
                  Las fotos se revelan en
                </Text>

                <SquircleView
                  style={[
                    styles.countdownCard,
                    {
                      backgroundColor: theme.dark
                        ? "rgba(42,138,112,0.1)"
                        : "rgba(42,138,112,0.05)",
                      borderColor: theme.colors.outlineVariant,
                      borderWidth: 1,
                    },
                  ]}
                  cornerSmoothing={1}
                >
                  <Text
                    style={[
                      styles.countdownText,
                      { color: theme.colors.primary },
                    ]}
                  >
                    {formatCountdown(revealsCountdown)}
                  </Text>
                </SquircleView>

                {/* Secondary CTA */}
                {canCreateParty && (
                <Pressable
                  onPress={() => setShowCreateModal(true)}
                  style={({ pressed }) => [
                    styles.emptyButton,
                    {
                      opacity: pressed ? 0.9 : 1,
                      transform: [{ scale: pressed ? 0.97 : 1 }],
                      marginTop: 20,
                    },
                  ]}
                >
                  <SquircleView
                    style={[
                      styles.emptyButtonInner,
                      {
                        backgroundColor: "transparent",
                        borderColor: theme.colors.outlineVariant,
                        borderWidth: 1,
                      },
                    ]}
                    cornerSmoothing={1}
                  >
                    <Ionicons
                      name="add"
                      size={20}
                      color={theme.colors.onSurface}
                    />
                    <Text
                      style={[
                        styles.emptyButtonText,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      Crear otro flashback
                    </Text>
                  </SquircleView>
                </Pressable>
                )}
              </SquircleView>
            </Animated.View>
          </ScrollView>

          <CreatePartyModal
            visible={showCreateModal}
            onDismiss={() => setShowCreateModal(false)}
            groupId={id!}
            onCreated={loadParty}
          />
          {archiveModal}
        </View>
      </>
    );
  }

  // ─── Feature items for empty state ─────────────────────────────────
  const features: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    desc: string;
  }[] = [
    {
      icon: "camera-outline",
      title: "Sacad fotos a ciegas",
      desc: "Nadie ve las fotos hasta que se revelen",
    },
    {
      icon: "film-outline",
      title: "Carrete limitado",
      desc: "24 o 36 fotos, como las cámaras de verdad",
    },
    {
      icon: "eye-outline",
      title: "Revelado sorpresa",
      desc: "Revive la noche al día siguiente",
    },
  ];

  // ─── Empty state (no party or archived) ─────────────────────────────
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <CustomHeader title="" showBackButton />

        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + 40 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Title ─── */}
          <Animated.View
            entering={FadeInUp.duration(500)}
            style={styles.titleBlock}
          >
            <Text style={[styles.screenTitle, { color: theme.colors.primary }]}>
              Flashback
            </Text>
            <Text
              style={[
                styles.screenSubtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Cámara desechable compartida
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

          {selectorButton}

          {/* ─── Empty card ─── */}
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
                  name="camera-outline"
                  size={36}
                  color={theme.colors.primary}
                />
              </SquircleView>

              <Text
                style={[styles.emptyTitle, { color: theme.colors.onSurface }]}
              >
                Crea un Flashback
              </Text>

              {/* Feature highlights */}
              <View style={styles.featuresContainer}>
                {features.map((f, i) => (
                  <Animated.View
                    key={f.icon}
                    entering={FadeInDown.duration(300).delay(200 + i * 80)}
                    style={styles.featureRow}
                  >
                    <SquircleView
                      style={[
                        styles.featureIconBox,
                        {
                          backgroundColor: theme.dark
                            ? "rgba(42,138,112,0.12)"
                            : "rgba(42,138,112,0.06)",
                        },
                      ]}
                      cornerSmoothing={1}
                    >
                      <Ionicons
                        name={f.icon}
                        size={18}
                        color={theme.colors.primary}
                      />
                    </SquircleView>
                    <View style={styles.featureText}>
                      <Text
                        style={[
                          styles.featureTitle,
                          { color: theme.colors.onSurface },
                        ]}
                      >
                        {f.title}
                      </Text>
                      <Text
                        style={[
                          styles.featureDesc,
                          { color: theme.colors.onSurfaceVariant },
                        ]}
                      >
                        {f.desc}
                      </Text>
                    </View>
                  </Animated.View>
                ))}
              </View>

              {/* CTA Button */}
              {canCreateParty && (
              <Pressable
                onPress={() => setShowCreateModal(true)}
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
                    Empezar Flashback
                  </Text>
                </SquircleView>
              </Pressable>
              )}
            </SquircleView>
          </Animated.View>
        </ScrollView>

        <CreatePartyModal
          visible={showCreateModal}
          onDismiss={() => setShowCreateModal(false)}
          groupId={id!}
          onCreated={loadParty}
        />
        {archiveModal}
      </View>
    </>
  );
}

// ─── Create Party Modal ───────────────────────────────────────────────
export interface CreatePartyModalProps {
  visible: boolean;
  onDismiss: () => void;
  groupId: string;
  onCreated: () => void;
}

export function CreatePartyModal({
  visible,
  onDismiss,
  groupId,
  onCreated,
}: CreatePartyModalProps) {
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();

  const [name, setName] = useState("");
  const [startsAt, setStartsAt] = useState(new Date());
  const [endsAt, setEndsAt] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 4);
    return d;
  });
  const [revealsAt, setRevealsAt] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 12);
    return d;
  });
  const [photoLimit, setPhotoLimit] = useState<24 | 36>(36);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isIOS = Platform.OS === "ios";

  const openAndroidDatetime = (
    value: Date,
    onChange: (d: Date) => void,
    minimumDate?: Date,
  ) => {
    DateTimePickerAndroid.open({
      value,
      mode: "date",
      minimumDate,
      onChange: (event, selectedDate) => {
        if (event.type === "dismissed" || !selectedDate) return;
        const datePart = selectedDate;
        DateTimePickerAndroid.open({
          value: new Date(
            datePart.getFullYear(),
            datePart.getMonth(),
            datePart.getDate(),
            value.getHours(),
            value.getMinutes(),
          ),
          mode: "time",
          is24Hour: true,
          onChange: (evt, timeDate) => {
            if (evt.type === "dismissed" || !timeDate) return;
            const final = new Date(
              datePart.getFullYear(),
              datePart.getMonth(),
              datePart.getDate(),
              timeDate.getHours(),
              timeDate.getMinutes(),
            );
            onChange(final);
          },
        });
      },
    });
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      showSnackbar("Pon un nombre al flashback", "info");
      return;
    }
    if (endsAt <= startsAt) {
      showSnackbar("La hora de fin debe ser después del inicio", "info");
      return;
    }
    if (revealsAt <= endsAt) {
      showSnackbar("La revelación debe ser después del fin", "info");
      return;
    }

    try {
      setIsSubmitting(true);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await flashbackService.createParty({
        group_id: groupId,
        name: name.trim(),
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
        reveals_at: revealsAt.toISOString(),
        photo_limit: photoLimit,
      });
      showSnackbar("Flashback creado!", "success");
      onDismiss();
      onCreated();
      setName("");
    } catch (e) {
      console.error("Error creating party:", e);
      showSnackbar("Error al crear el flashback", "error");
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
        {/* Name */}
        <View style={styles.fieldGroup}>
          <Text
            style={[
              styles.fieldLabel,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            Nombre
          </Text>
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
              value={name}
              onChangeText={setName}
              placeholder="Noche de verano..."
              placeholderTextColor={theme.colors.outline}
              style={[styles.textInput, { color: theme.colors.onSurface }]}
              maxLength={60}
            />
          </SquircleView>
        </View>

        {/* Schedule */}
        <View style={styles.fieldGroup}>
          <Text
            style={[
              styles.fieldLabel,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            Horario
          </Text>

          {/* Start + End — same row */}
          <View style={styles.dateRow}>
            <SquircleView
              style={[
                styles.dateCard,
                styles.dateCardHalf,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  borderColor: theme.colors.outlineVariant,
                  borderWidth: 1,
                },
              ]}
              cornerSmoothing={1}
            >
              <Ionicons
                name="play-outline"
                size={18}
                color={theme.colors.primary}
              />
              <View style={styles.dateInfo}>
                <Text
                  style={[
                    styles.dateLabel,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Inicio
                </Text>
                {isIOS ? (
                  <DateTimePicker
                    value={startsAt}
                    mode="datetime"
                    display="compact"
                    onChange={(_, d) => {
                      if (d) setStartsAt(d);
                    }}
                    minimumDate={new Date()}
                    locale="es-ES"
                  />
                ) : (
                  <Pressable
                    onPress={() =>
                      openAndroidDatetime(startsAt, setStartsAt, new Date())
                    }
                  >
                    <Text
                      style={[
                        styles.dateValue,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      {formatDateTime(startsAt)}
                    </Text>
                  </Pressable>
                )}
              </View>
            </SquircleView>

            <SquircleView
              style={[
                styles.dateCard,
                styles.dateCardHalf,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  borderColor: theme.colors.outlineVariant,
                  borderWidth: 1,
                },
              ]}
              cornerSmoothing={1}
            >
              <Ionicons
                name="stop-outline"
                size={18}
                color={theme.colors.primary}
              />
              <View style={styles.dateInfo}>
                <Text
                  style={[
                    styles.dateLabel,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Fin
                </Text>
                {isIOS ? (
                  <DateTimePicker
                    value={endsAt}
                    mode="datetime"
                    display="compact"
                    onChange={(_, d) => {
                      if (d) setEndsAt(d);
                    }}
                    minimumDate={startsAt}
                    locale="es-ES"
                  />
                ) : (
                  <Pressable
                    onPress={() =>
                      openAndroidDatetime(endsAt, setEndsAt, startsAt)
                    }
                  >
                    <Text
                      style={[
                        styles.dateValue,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      {formatDateTime(endsAt)}
                    </Text>
                  </Pressable>
                )}
              </View>
            </SquircleView>
          </View>

          {/* Reveal */}
          <SquircleView
            style={[
              styles.dateCard,
              {
                backgroundColor: theme.colors.surfaceVariant,
                borderColor: theme.colors.outlineVariant,
                borderWidth: 1,
              },
            ]}
            cornerSmoothing={1}
          >
            <Ionicons
              name="eye-outline"
              size={18}
              color={theme.colors.primary}
            />
            <View style={styles.dateInfo}>
              <Text
                style={[
                  styles.dateLabel,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Revelación
              </Text>
              {isIOS ? (
                <DateTimePicker
                  value={revealsAt}
                  mode="datetime"
                  display="compact"
                  onChange={(_, d) => {
                    if (d) setRevealsAt(d);
                  }}
                  minimumDate={endsAt}
                  locale="es-ES"
                />
              ) : (
                <Pressable
                  onPress={() =>
                    openAndroidDatetime(revealsAt, setRevealsAt, endsAt)
                  }
                >
                  <Text
                    style={[
                      styles.dateValue,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    {formatDateTime(revealsAt)}
                  </Text>
                </Pressable>
              )}
            </View>
          </SquircleView>
        </View>

        {/* Photo limit */}
        <View style={styles.fieldGroup}>
          <Text
            style={[
              styles.fieldLabel,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
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
          style={({ pressed }) => [
            { opacity: pressed || isSubmitting ? 0.7 : 1 },
          ]}
        >
          <SquircleView
            style={[
              styles.createButton,
              { backgroundColor: theme.colors.primary },
            ]}
            cornerSmoothing={1}
          >
            <Ionicons name="camera" size={18} color={theme.colors.onPrimary} />
            <Text
              style={[
                styles.createButtonText,
                { color: theme.colors.onPrimary },
              ]}
            >
              {isSubmitting ? "Creando..." : "Empezar Flashback"}
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
  scrollContent: { paddingHorizontal: 24, paddingTop: 0 },
  centerContent: { alignItems: "center", marginTop: 60, gap: 12 },

  // Title (matches Bloc/Planes screens)
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

  // Empty state card
  emptyContainer: { marginTop: 0 },
  emptyCard: {
    borderRadius: 24,
    padding: 32,
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
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontFamily: "Archivo-Medium",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    letterSpacing: 0.1,
    paddingHorizontal: 8,
    marginBottom: 20,
  },

  // Feature highlights
  featuresContainer: {
    width: "100%",
    gap: 12,
    marginBottom: 24,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 14,
    marginBottom: 1,
  },
  featureDesc: {
    fontFamily: "Archivo-Medium",
    fontSize: 12,
    letterSpacing: 0.1,
  },

  // Empty CTA button
  emptyButton: { width: "100%" },
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
  skeletonTitle: {
    width: 160,
    height: 40,
    borderRadius: 12,
    marginBottom: 8,
  },
  skeletonSubtitle: {
    width: 210,
    height: 16,
    borderRadius: 8,
  },
  skeletonSelector: {
    height: 42,
    borderRadius: 12,
    marginBottom: 12,
  },
  skeletonCard: {
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
  },
  skeletonLineLg: {
    width: "72%",
    height: 20,
    borderRadius: 10,
    marginTop: 20,
    marginBottom: 10,
  },
  skeletonLineMd: {
    width: "90%",
    height: 14,
    borderRadius: 8,
    marginBottom: 8,
  },
  skeletonLineSm: {
    width: "56%",
    height: 14,
    borderRadius: 8,
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

  selectorButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  selectorButtonText: {
    fontFamily: "Archivo-Medium",
    fontSize: 13,
  },

  archiveSheetContent: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  archiveSheetTitle: {
    fontFamily: "Archivo-Bold",
    fontSize: 18,
    marginBottom: 12,
  },
  archiveSheetScroll: {
    maxHeight: 400,
  },
  archiveSheetRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
  archiveSheetName: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 15,
    flex: 1,
  },
  archiveSheetMeta: {
    fontFamily: "Archivo-Medium",
    fontSize: 12,
  },
  archiveSheetPhotos: {
    fontFamily: "Archivo-Medium",
    fontSize: 12,
  },

  // Modal
  modalContent: { paddingHorizontal: 24, paddingBottom: 20, gap: 16 },
  modalTitle: {
    fontFamily: "Archivo-Bold",
    fontSize: 22,
    textAlign: "center",
    marginBottom: 4,
  },
  fieldGroup: { gap: 8 },
  fieldLabel: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 13,
    letterSpacing: 0.3,
  },
  inputContainer: {
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 2,
  },
  textInput: {
    fontFamily: "Archivo-Medium",
    fontSize: 15,
    paddingVertical: 12,
  },
  dateRow: {
    flexDirection: "row",
    gap: 8,
  },
  dateCard: {
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  dateCardHalf: { flex: 1 },
  dateInfo: { flex: 1 },
  dateLabel: {
    fontFamily: "Archivo-Medium",
    fontSize: 11,
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  dateValue: { fontFamily: "Archivo-SemiBold", fontSize: 14 },

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
    borderRadius: 16,
    marginTop: 4,
  },
  createButtonText: {
    fontFamily: "Archivo-Bold",
    fontSize: 16,
    letterSpacing: 0.3,
  },
});
