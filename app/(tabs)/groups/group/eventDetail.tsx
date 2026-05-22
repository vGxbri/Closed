import { Ionicons } from "@expo/vector-icons";
import { BlurTargetView } from "expo-blur";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Text, useTheme } from "react-native-paper";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConfirmDialog, DialogType } from "@/components/ui/ConfirmDialog";
import { CustomHeader } from "@/components/ui/CustomHeader";
import { MenuOption, OptionsMenu } from "@/components/ui/OptionsMenu";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useSnackbar } from "@/components/ui/SnackbarContext";
import { useAuth, useGroup } from "@/hooks";
import { getEventScheduleDisplay } from "@/lib/eventSchedule";
import { eventsService } from "@/services/events.service";
import {
  CalendarEventWithDetails,
  EventParticipantWithProfile,
  GalleryImageWithUser,
  RsvpStatus,
} from "@/types/database";

// ─── Constants ──────────────────────────────────────────────────────────
const RSVP_CONFIG: Record<RsvpStatus, { label: string; icon: string; color: string }> = {
  accepted: { label: "Voy", icon: "checkmark-circle", color: "#10B981" },
  maybe: { label: "Quizás", icon: "help-circle", color: "#F59E0B" },
  declined: { label: "No voy", icon: "close-circle", color: "#EF4444" },
  pending: { label: "Pendiente", icon: "time-outline", color: "#6366F1" },
};

// ─── Participant Row ────────────────────────────────────────────────────
interface ParticipantRowProps {
  participant: EventParticipantWithProfile;
}

const ParticipantRow = React.memo<ParticipantRowProps>(({ participant }) => {
  const theme = useTheme();
  const cfg = RSVP_CONFIG[participant.status];
  return (
    <View style={styles.participantRow}>
      <UserAvatar
        uri={participant.user?.avatar_url}
        name={participant.user?.display_name || "?"}
        size={36}
        borderRadius={12}
      />
      <Text style={[styles.participantName, { color: theme.colors.onSurface }]} numberOfLines={1}>
        {participant.user?.display_name || "Usuario"}
      </Text>
      <View style={[styles.statusBadge, { backgroundColor: `${cfg.color}20` }]}>
        <Ionicons name={cfg.icon as keyof typeof Ionicons.glyphMap} size={14} color={cfg.color} />
        <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
      </View>
    </View>
  );
});
ParticipantRow.displayName = "ParticipantRow";

// ─── Skeleton ───────────────────────────────────────────────────────────
const SkeletonBar = React.memo<{
  width: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: object;
}>(({ width, height, borderRadius = 8, style }) => {
  const theme = useTheme();
  return (
    <View
      style={[
        { width, height, borderRadius, backgroundColor: theme.colors.surfaceVariant },
        style,
      ]}
    />
  );
});
SkeletonBar.displayName = "SkeletonBar";

const EventDetailSkeleton = React.memo(() => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const cardStyle = {
    backgroundColor: theme.colors.surface,
    borderColor: theme.colors.outlineVariant,
    borderWidth: 1,
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <CustomHeader title="" showBackButton={true} />
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeIn.duration(400)} style={styles.headerBlock}>
            <SkeletonBar width="70%" height={28} borderRadius={10} />
            <SkeletonBar width="45%" height={14} borderRadius={6} style={{ marginTop: 10 }} />
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(350).delay(60)}>
            <SquircleView style={[styles.infoCard, cardStyle]} cornerSmoothing={1}>
              {[0, 1, 2].map((i) => (
                <React.Fragment key={i}>
                  {i > 0 && (
                    <View style={[styles.infoSep, { backgroundColor: theme.colors.outlineVariant }]} />
                  )}
                  <View style={styles.infoRow}>
                    <View style={[styles.skeletonIcon, { backgroundColor: theme.colors.surfaceVariant }]} />
                    <SkeletonBar width="75%" height={14} borderRadius={7} />
                  </View>
                </React.Fragment>
              ))}
            </SquircleView>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(350).delay(120)}>
            <SquircleView style={[styles.descCard, cardStyle]} cornerSmoothing={1}>
              <View style={[styles.skeletonIcon, { backgroundColor: theme.colors.surfaceVariant }]} />
              <View style={styles.skeletonDescCol}>
                <SkeletonBar width="100%" height={12} borderRadius={6} />
                <SkeletonBar width="85%" height={12} borderRadius={6} style={{ marginTop: 8 }} />
                <SkeletonBar width="60%" height={12} borderRadius={6} style={{ marginTop: 8 }} />
              </View>
            </SquircleView>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(350).delay(180)} style={styles.rsvpSection}>
            <SkeletonBar width={90} height={13} borderRadius={6} style={{ marginBottom: 10 }} />
            <View style={styles.rsvpRow}>
              {[0, 1, 2].map((i) => (
                <SquircleView
                  key={i}
                  style={[styles.rsvpButton, cardStyle, { flex: 1 }]}
                  cornerSmoothing={1}
                >
                  <View style={[styles.skeletonRsvpIcon, { backgroundColor: theme.colors.surfaceVariant }]} />
                  <SkeletonBar width="50%" height={10} borderRadius={5} style={{ marginTop: 8 }} />
                </SquircleView>
              ))}
            </View>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(350).delay(240)} style={styles.participantsSection}>
            <SkeletonBar width={160} height={16} borderRadius={8} style={{ marginBottom: 12 }} />
            <SquircleView style={[styles.participantsCard, cardStyle]} cornerSmoothing={1}>
              {[0, 1, 2, 3].map((i) => (
                <View key={i} style={styles.participantRow}>
                  <View style={[styles.skeletonAvatar, { backgroundColor: theme.colors.surfaceVariant }]} />
                  <SkeletonBar width="40%" height={14} borderRadius={7} />
                  <SkeletonBar width={72} height={24} borderRadius={10} />
                </View>
              ))}
            </SquircleView>
          </Animated.View>
        </ScrollView>
      </View>
    </>
  );
});
EventDetailSkeleton.displayName = "EventDetailSkeleton";

// ─── Main Screen ────────────────────────────────────────────────────────
export default function EventDetailScreen() {
  const { id, eventId } = useLocalSearchParams<{ id: string; eventId: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const { user } = useAuth();
  const { isAdmin } = useGroup(id);
  const backgroundRef = React.useRef(null);

  const [event, setEvent] = useState<CalendarEventWithDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingRsvp, setIsUpdatingRsvp] = useState(false);

  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean; title: string; message: string; type: DialogType;
    confirmText?: string; cancelText?: string; onConfirm: () => void;
  }>({ visible: false, title: "", message: "", type: "info", onConfirm: () => {} });
  const hideDialog = () => setDialogConfig((prev) => ({ ...prev, visible: false }));

  const [optionsMenu, setOptionsMenu] = useState<{ visible: boolean; title: string; options: MenuOption[] }>({
    visible: false, title: "", options: [],
  });
  const hideOptionsMenu = () => setOptionsMenu((prev) => ({ ...prev, visible: false }));

  // ─── Load data ─────────────────────────────────────────────
  const loadEvent = useCallback(async () => {
    if (!eventId) return;
    try {
      setIsLoading(true);
      const data = await eventsService.getEvent(eventId);
      setEvent(data);


    } catch (error) {
      console.error("Error loading event:", error);
      showSnackbar("Error al cargar el evento", "error");
    } finally {
      setIsLoading(false);
    }
  }, [eventId, id, showSnackbar]);

  useEffect(() => { loadEvent(); }, [loadEvent]);

  // ─── RSVP ──────────────────────────────────────────────────
  const myRsvp = useMemo<RsvpStatus | null>(() => {
    if (!event || !user) return null;
    const me = event.participants.find((p) => p.user_id === user.id);
    return me?.status || null;
  }, [event, user]);

  const handleRsvp = useCallback(async (status: RsvpStatus) => {
    if (!eventId || isUpdatingRsvp) return;
    try {
      setIsUpdatingRsvp(true);
      await eventsService.updateRsvp(eventId, status);
      // Refresh
      const data = await eventsService.getEvent(eventId);
      setEvent(data);
      const cfg = RSVP_CONFIG[status];
      showSnackbar(`Respuesta: ${cfg.label}`, "success");
    } catch (error) {
      console.error("Error updating RSVP:", error);
      showSnackbar("Error al actualizar tu respuesta", "error");
    } finally {
      setIsUpdatingRsvp(false);
    }
  }, [eventId, isUpdatingRsvp, showSnackbar]);

  // ─── Delete ────────────────────────────────────────────────
  const handleDelete = useCallback(() => {
    setDialogConfig({
      visible: true,
      title: "Eliminar evento",
      message: `¿Seguro que quieres eliminar "${event?.title}"? Esta acción no se puede deshacer.`,
      type: "error",
      confirmText: "Eliminar",
      cancelText: "Cancelar",
      onConfirm: async () => {
        hideDialog();
        try {
          await eventsService.deleteEvent(eventId);
          showSnackbar("Evento eliminado", "success");
          router.back();
        } catch (error) {
          console.error("Error deleting event:", error);
          showSnackbar("Error al eliminar el evento", "error");
        }
      },
    });
  }, [event, eventId, showSnackbar, router]);

  // ─── Options Menu ──────────────────────────────────────────
  const handleOptions = useCallback(() => {
    const options: MenuOption[] = [];
    options.push({ label: "Eliminar evento", icon: "trash-outline", isDestructive: true, action: handleDelete });
    setOptionsMenu({ visible: true, title: "Opciones", options });
  }, [handleDelete]);

  const isCreator = event?.created_by === user?.id;
  const canManage = isCreator || isAdmin;

  const schedule = useMemo(
    () => (event ? getEventScheduleDisplay(event) : null),
    [event],
  );

  const acceptedCount = useMemo(
    () => event?.participants.filter((p) => p.status === "accepted").length || 0,
    [event],
  );

  // ─── Loading / Error ───────────────────────────────────────
  if (isLoading) {
    return <EventDetailSkeleton />;
  }

  if (!event) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
          <CustomHeader title="" showBackButton={true} />
          <View style={styles.loadingCenter}>
            <Ionicons name="calendar-outline" size={48} color={theme.colors.onSurfaceVariant} />
            <Text style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}>Evento no encontrado</Text>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <BlurTargetView ref={backgroundRef} style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <CustomHeader
          title=""
          showBackButton={true}
          rightAction={canManage ? (
            <TouchableOpacity onPress={handleOptions} activeOpacity={0.7}>
              <Ionicons name="ellipsis-horizontal" size={24} color={theme.colors.onSurface} />
            </TouchableOpacity>
          ) : undefined}
        />

        <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]} showsVerticalScrollIndicator={false}>

          {/* ─── Event Header ─── */}
          <Animated.View entering={FadeIn.duration(500)} style={styles.headerBlock}>
            <Text style={[styles.headerTitle, { color: theme.colors.onSurface }]}>{event.title}</Text>
            <Text style={[styles.headerCreator, { color: theme.colors.onSurfaceVariant }]}>
              Creado por {event.creator?.display_name || "alguien"}
            </Text>
          </Animated.View>

          {/* ─── Info Cards ─── */}
          <Animated.View entering={FadeInDown.duration(300).delay(100)}>
            <SquircleView style={[styles.infoCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant, borderWidth: 1 }]} cornerSmoothing={1}>
              <View style={styles.infoRow}>
                <Ionicons
                  name={schedule?.isMultiDay ? "calendar" : "calendar-outline"}
                  size={18}
                  color={theme.colors.primary}
                />
                <Text style={[styles.infoText, { color: theme.colors.onSurface }]}>
                  {schedule?.dateLabel}
                </Text>
              </View>
              <View style={[styles.infoSep, { backgroundColor: theme.colors.outlineVariant }]} />
              <View style={styles.infoRow}>
                <Ionicons
                  name={event.is_all_day ? "sunny-outline" : "time-outline"}
                  size={18}
                  color={theme.colors.primary}
                />
                <Text style={[styles.infoText, { color: theme.colors.onSurface }]}>
                  {schedule?.timeLabel}
                </Text>
              </View>
              {event.location && (
                <>
                  <View style={[styles.infoSep, { backgroundColor: theme.colors.outlineVariant }]} />
                  <View style={styles.infoRow}>
                    <Ionicons name="location-outline" size={18} color={theme.colors.primary} />
                    <Text style={[styles.infoText, { color: theme.colors.onSurface }]}>{event.location}</Text>
                  </View>
                </>
              )}
            </SquircleView>
          </Animated.View>

          {/* ─── Description ─── */}
          {event.description && (
            <Animated.View entering={FadeInDown.duration(300).delay(160)}>
              <SquircleView style={[styles.descCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant, borderWidth: 1 }]} cornerSmoothing={1}>
                <Ionicons name="document-text-outline" size={16} color={theme.colors.onSurfaceVariant} />
                <Text style={[styles.descText, { color: theme.colors.onSurface }]}>{event.description}</Text>
              </SquircleView>
            </Animated.View>
          )}

          {/* ─── RSVP Section ─── */}
          {myRsvp !== null && (
            <Animated.View entering={FadeInDown.duration(300).delay(220)} style={styles.rsvpSection}>
              <Text style={[styles.rsvpTitle, { color: theme.colors.onSurfaceVariant }]}>Tu respuesta</Text>
              <View style={styles.rsvpRow}>
                {(["accepted", "maybe", "declined"] as RsvpStatus[]).map((status) => {
                  const cfg = RSVP_CONFIG[status];
                  const isSelected = myRsvp === status;
                  return (
                    <Pressable
                      key={status}
                      onPress={() => handleRsvp(status)}
                      disabled={isUpdatingRsvp}
                      style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.96 : 1 }], flex: 1 }]}
                    >
                      <SquircleView
                        style={[
                          styles.rsvpButton,
                          {
                            backgroundColor: isSelected ? `${cfg.color}20` : theme.colors.surface,
                            borderColor: isSelected ? cfg.color : theme.colors.outlineVariant,
                            borderWidth: isSelected ? 2 : 1,
                          },
                        ]}
                        cornerSmoothing={1}
                      >
                        <Ionicons name={cfg.icon as keyof typeof Ionicons.glyphMap} size={20} color={isSelected ? cfg.color : theme.colors.onSurfaceVariant} />
                        <Text style={[styles.rsvpButtonText, { color: isSelected ? cfg.color : theme.colors.onSurfaceVariant }]}>{cfg.label}</Text>
                      </SquircleView>
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>
          )}

          {/* ─── Participants ─── */}
          <Animated.View entering={FadeInDown.duration(300).delay(280)} style={styles.participantsSection}>
            <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
              Participantes ({acceptedCount}/{event.participants.length})
            </Text>
            <SquircleView style={[styles.participantsCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant, borderWidth: 1 }]} cornerSmoothing={1}>
              {event.participants.map((p) => (
                <ParticipantRow key={p.id} participant={p} />
              ))}
              {event.participants.length === 0 && (
                <View style={styles.emptyParticipants}>
                  <Text style={[styles.emptyParticipantsText, { color: theme.colors.onSurfaceVariant }]}>No hay participantes aún</Text>
                </View>
              )}
            </SquircleView>
          </Animated.View>

        </ScrollView>

        <ConfirmDialog visible={dialogConfig.visible} title={dialogConfig.title} message={dialogConfig.message} type={dialogConfig.type} confirmText={dialogConfig.confirmText} cancelText={dialogConfig.cancelText} onConfirm={dialogConfig.onConfirm} onCancel={hideDialog} showCancel={true} blurTargetRef={backgroundRef} />
        <OptionsMenu visible={optionsMenu.visible} title={optionsMenu.title} options={optionsMenu.options} onDismiss={hideOptionsMenu} blurTarget={backgroundRef} />
      </BlurTargetView>
    </>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 0 },
  loadingCenter: { flex: 1, justifyContent: "center", alignItems: "center", gap: 16 },
  emptyText: { fontFamily: "Archivo-Medium", fontSize: 15 },
  skeletonIcon: { width: 18, height: 18, borderRadius: 6 },
  skeletonDescCol: { flex: 1, gap: 0 },
  skeletonRsvpIcon: { width: 20, height: 20, borderRadius: 10 },
  skeletonAvatar: { width: 36, height: 36, borderRadius: 12 },

  // Header
  headerBlock: { alignItems: "center", paddingTop: 8, marginBottom: 20 },
  headerEmoji: { fontSize: 56, marginBottom: 12 },
  headerTitle: { fontFamily: "Archivo-Bold", fontSize: 24, textAlign: "center", letterSpacing: 0.3 },
  headerCreator: { fontFamily: "Archivo-Medium", fontSize: 13, marginTop: 6, letterSpacing: 0.2 },

  // Info card
  infoCard: { borderRadius: 20, padding: 16, marginBottom: 16 },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 6 },
  infoText: { fontFamily: "Archivo-Medium", fontSize: 14, flex: 1 },
  infoSep: { height: 1, marginLeft: 30 },
  colorDot: { width: 14, height: 14, borderRadius: 7 },

  // Description
  descCard: { borderRadius: 20, padding: 16, marginBottom: 16, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  descText: { fontFamily: "Archivo-Medium", fontSize: 14, flex: 1, lineHeight: 20 },

  // RSVP
  rsvpSection: { marginBottom: 20 },
  rsvpTitle: { fontFamily: "Archivo-SemiBold", fontSize: 13, letterSpacing: 0.3, marginBottom: 10 },
  rsvpRow: { flexDirection: "row", gap: 8 },
  rsvpButton: { borderRadius: 16, paddingVertical: 14, alignItems: "center", gap: 4 },
  rsvpButtonText: { fontFamily: "Archivo-SemiBold", fontSize: 12, letterSpacing: 0.2 },

  // Participants
  participantsSection: { marginBottom: 20 },
  sectionTitle: { fontFamily: "Archivo-Bold", fontSize: 15, letterSpacing: 0.3, marginBottom: 12 },
  participantsCard: { borderRadius: 18, overflow: "hidden" },
  participantRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, gap: 12 },
  participantName: { fontFamily: "Archivo-Medium", fontSize: 14, flex: 1 },
  statusBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontFamily: "Archivo-SemiBold", fontSize: 11, letterSpacing: 0.2 },
  emptyParticipants: { padding: 20, alignItems: "center" },
  emptyParticipantsText: { fontFamily: "Archivo-Medium", fontSize: 13 },

  // Gallery
  gallerySection: { marginBottom: 20 },
  galleryScroll: { gap: 8 },
  galleryThumb: { width: 90, height: 90, borderRadius: 16, overflow: "hidden" },
  galleryThumbImage: { width: 90, height: 90 },
  galleryEmpty: { borderRadius: 20, padding: 24, alignItems: "center", gap: 8 },
  galleryEmptyText: { fontFamily: "Archivo-Medium", fontSize: 13, textAlign: "center", lineHeight: 18, letterSpacing: 0.2 },
});
