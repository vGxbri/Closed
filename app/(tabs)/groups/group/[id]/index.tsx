import { InviteModal } from "@/components/InviteModal";
import { MemberAvatarsRow } from "@/components/MemberAvatar";
import { MemberListBottomSheet } from "@/components/MemberListBottomSheet";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useAuth, useGroup } from "@/hooks";
import { galleryService } from "@/services/gallery.service";
import { eventsService } from "@/services/events.service";
import { bucketListService } from "@/services/bucketList.service";
import { sharedExpensesService } from "@/services/sharedExpenses.service";
import { awardsService } from "@/services/awards.service";
import { flashbackService } from "@/services/flashback.service";
import { FlashbackPartyStatus } from "@/types/database";
import { formatCents } from "@/lib/sharedExpenses";
import { widgetsService } from "@/services/widgets.service";
import { CalendarEvent, GroupWidgetWithDetails } from "@/types/database";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Image } from "expo-image";
import { Stack, useGlobalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Text, useTheme } from "react-native-paper";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConfirmDialog, DialogType } from "@/components/ui/ConfirmDialog";
import { CustomHeader } from "@/components/ui/CustomHeader";
import { MenuOption, OptionsMenu } from "@/components/ui/OptionsMenu";
import { useSnackbar } from "@/components/ui/SnackbarContext";
import { BlurTargetView } from "expo-blur";

// ─── Constants ─────────────────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_GAP = 14;
const CARD_WIDTH = (SCREEN_WIDTH - 24 * 2 - CARD_GAP) / 2;

// ─── Widget Card ───────────────────────────────────────────────────────
// Widget names that have special renderings
const WIDGET_ARCHIVO = "Archivo";
const WIDGET_AGENDA = "Agenda";
const WIDGET_PLANES = "Planes";
const WIDGET_PLANES_LEGACY = "Bucket List";
const WIDGET_GASTOS = "Gastos";
const WIDGET_PREMIOS = "Premios";
const WIDGET_FLASHBACK = "Flashback";

interface WidgetCardProps {
  widget: GroupWidgetWithDetails;
  index: number;
  onPress: (widget: GroupWidgetWithDetails) => void;
  groupId: string;
}

// Archive/Gallery Widget — 2x1 card with photo background + storage bar
const STORAGE_LIMIT_BYTES = 1 * 1024 * 1024 * 1024; // 1 GB

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const ArchivoWidgetCard = React.memo<WidgetCardProps>(
  ({ widget, index, onPress, groupId }) => {
    const theme = useTheme();
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [imageCount, setImageCount] = useState(0);
    const [storageUsed, setStorageUsed] = useState(0);

    useFocusEffect(
      React.useCallback(() => {
        let cancelled = false;
        const load = async () => {
          try {
            const [url, count, used] = await Promise.all([
              galleryService.getLatestImage(groupId),
              galleryService.getImageCount(groupId),
              galleryService.getStorageUsed(groupId),
            ]);
            if (!cancelled) {
              setPreviewUrl(url);
              setImageCount(count);
              setStorageUsed(used);
            }
          } catch (e) {
            console.error("Error loading gallery preview:", e);
          }
        };
        load();
        return () => { cancelled = true; };
      }, [groupId])
    );

    const storageRatio = Math.min(storageUsed / STORAGE_LIMIT_BYTES, 1);

    return (
      <Animated.View
        entering={FadeIn.duration(400).delay(200 + index * 80)}
        style={styles.bentoItemWide}
      >
        <Pressable
          onPress={() => onPress(widget)}
          style={({ pressed }) => [
            {
              opacity: pressed ? 0.92 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
        >
          <SquircleView
            style={[
              styles.archivoCard,
              {
                backgroundColor: previewUrl
                  ? "transparent"
                  : theme.colors.surfaceVariant,
                borderColor: theme.colors.outlineVariant,
                borderWidth: previewUrl ? 0 : 1,
              },
            ]}
            cornerSmoothing={1}
          >
            {/* Background image */}
            {previewUrl && (
              <>
                <Image
                  source={{ uri: previewUrl }}
                  style={StyleSheet.absoluteFillObject}
                  contentFit="cover"
                  transition={300}
                />
                {/* Dark overlay for text readability */}
                <View
                  style={[
                    StyleSheet.absoluteFillObject,
                    {
                      backgroundColor: "rgba(0,0,0,0.4)",
                      borderRadius: 22,
                    },
                  ]}
                />
              </>
            )}

            {/* Content overlay */}
            <View style={styles.archivoContent}>
              {/* Top row: icon + storage bar */}
              <View style={styles.archivoTopRow}>
                <SquircleView
                  style={[
                    styles.archivoIconBadge,
                    {
                      backgroundColor: previewUrl
                        ? "rgba(255,255,255,0.2)"
                        : theme.colors.surface,
                      borderColor: previewUrl
                        ? "rgba(255,255,255,0.3)"
                        : theme.colors.outlineVariant,
                      borderWidth: 1,
                    },
                  ]}
                  cornerSmoothing={1}
                >
                  <Ionicons
                    name="images-outline"
                    size={18}
                    color={previewUrl ? "#FFFFFF" : theme.colors.onSurfaceVariant}
                  />
                </SquircleView>

                {/* Storage bar */}
                <View style={styles.archivoStorageBlock}>
                  <View
                    style={[
                      styles.archivoStorageBarBg,
                      {
                        backgroundColor: previewUrl
                          ? "rgba(255,255,255,0.2)"
                          : theme.colors.outlineVariant,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.archivoStorageBarFill,
                        {
                          width: `${Math.max(storageRatio * 100, 2)}%`,
                          backgroundColor: storageRatio > 0.9
                            ? "#FF6B6B"
                            : storageRatio > 0.7
                              ? "#FFA726"
                              : previewUrl
                                ? "rgba(255,255,255,0.85)"
                                : theme.colors.primary,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.archivoStorageLabel,
                      {
                        color: previewUrl
                          ? "rgba(255,255,255,0.7)"
                          : theme.colors.onSurfaceVariant,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {formatBytes(storageUsed)} / 1 GB
                  </Text>
                </View>
              </View>

              {/* Bottom: text */}
              <View style={styles.archivoTextBlock}>
                <Text
                  style={[
                    styles.archivoTitle,
                    {
                      color: previewUrl ? "#FFFFFF" : theme.colors.onSurface,
                    },
                  ]}
                  numberOfLines={1}
                >
                  Archivo
                </Text>
                <Text
                  style={[
                    styles.archivoSubtitle,
                    {
                      color: previewUrl
                        ? "rgba(255,255,255,0.8)"
                        : theme.colors.onSurfaceVariant,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {imageCount > 0
                    ? `${imageCount} ${imageCount === 1 ? "foto" : "fotos"}`
                    : "Galería compartida"}
                </Text>
              </View>
            </View>
          </SquircleView>
        </Pressable>
      </Animated.View>
    );
  }
);

ArchivoWidgetCard.displayName = "ArchivoWidgetCard";

// Generic Widget Card — standard 1x1 card
const GenericWidgetCard = React.memo<WidgetCardProps>(
  ({ widget, index, onPress }) => {
    const theme = useTheme();

    return (
      <Animated.View
        entering={FadeIn.duration(400).delay(200 + index * 80)}
        style={styles.bentoItem}
      >
        <Pressable
          onPress={() => onPress(widget)}
          style={({ pressed }) => [
            {
              opacity: pressed ? 0.92 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
        >
          <SquircleView
            style={[
              styles.widgetCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
                borderWidth: 1,
              },
            ]}
            cornerSmoothing={1}
          >
            {/* Icon */}
            <SquircleView
              style={[
                styles.widgetIconContainer,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  borderColor: theme.colors.outlineVariant,
                  borderWidth: 1,
                },
              ]}
              cornerSmoothing={1}
            >
              <Ionicons
                name={
                  (widget.widget.icon as keyof typeof Ionicons.glyphMap) ||
                  "grid-outline"
                }
                size={24}
                color="#FFFFFF"
              />
            </SquircleView>

            {/* Info */}
            <View style={styles.widgetInfo}>
              <Text
                style={[styles.widgetName, { color: theme.colors.onSurface }]}
                numberOfLines={1}
              >
                {widget.widget.name}
              </Text>
              <Text
                style={[
                  styles.widgetSubtitle,
                  { color: theme.colors.onSurfaceVariant },
                ]}
                numberOfLines={1}
              >
                {widget.widget.subtitle}
              </Text>
            </View>
          </SquircleView>
        </Pressable>
      </Animated.View>
    );
  }
);

GenericWidgetCard.displayName = "GenericWidgetCard";

// Agenda Widget Card — shows next upcoming event
const AgendaWidgetCard = React.memo<WidgetCardProps>(
  ({ widget, index, onPress, groupId }) => {
    const theme = useTheme();
    const [nextEvent, setNextEvent] = useState<CalendarEvent | null>(null);
    const [monthCount, setMonthCount] = useState(0);

    useFocusEffect(
      React.useCallback(() => {
        let cancelled = false;
        const load = async () => {
          try {
            const [upcoming, count] = await Promise.all([
              eventsService.getUpcomingEvents(groupId, 1),
              eventsService.getMonthEventCount(groupId),
            ]);
            if (!cancelled) {
              setNextEvent(upcoming[0] || null);
              setMonthCount(count);
            }
          } catch (e) {
            console.error("Error loading agenda preview:", e);
          }
        };
        load();

        const subscription = supabase
          .channel(`group-agenda-realtime:${groupId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'events',
              filter: `group_id=eq.${groupId}`,
            },
            () => {
              load();
            }
          )
          .subscribe();

        return () => {
          cancelled = true;
          subscription.unsubscribe();
        };
      }, [groupId])
    );

    const formatEventDate = (dateStr: string, isAllDay: boolean): string => {
      const d = new Date(dateStr);
      const day = d.getDate();
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const month = months[d.getMonth()];
      if (isAllDay) return `${day} ${month} · Todo el día`;
      const h = d.getHours().toString().padStart(2, '0');
      const m = d.getMinutes().toString().padStart(2, '0');
      return `${day} ${month} · ${h}:${m}`;
    };

    return (
      <Animated.View
        entering={FadeIn.duration(400).delay(200 + index * 80)}
        style={styles.bentoItem}
      >
        <Pressable
          onPress={() => onPress(widget)}
          style={({ pressed }) => [
            {
              opacity: pressed ? 0.92 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
        >
          <SquircleView
            style={[
              styles.widgetCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
                borderWidth: 1,
              },
            ]}
            cornerSmoothing={1}
          >
            {/* Icon */}
            <SquircleView
              style={[
                styles.widgetIconContainer,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  borderColor: theme.colors.outlineVariant,
                  borderWidth: 1,
                },
              ]}
              cornerSmoothing={1}
            >
              <Ionicons
                name="calendar-outline"
                size={24}
                color="#FFFFFF"
              />
            </SquircleView>

            {/* Info */}
            <View style={styles.widgetInfo}>
              <Text
                style={[styles.widgetName, { color: theme.colors.onSurface }]}
                numberOfLines={1}
              >
                Agenda
              </Text>
              {nextEvent ? (
                <>
                  <Text
                    style={[
                      styles.widgetSubtitle,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                    numberOfLines={1}
                  >
                    {nextEvent.title}
                  </Text>
                  <Text
                    style={[
                      styles.agendaDate,
                      { color: theme.colors.primary },
                    ]}
                    numberOfLines={1}
                  >
                    {formatEventDate(nextEvent.starts_at, nextEvent.is_all_day)}
                  </Text>
                </>
              ) : (
                <Text
                  style={[
                    styles.widgetSubtitle,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                  numberOfLines={1}
                >
                  {monthCount > 0
                    ? `${monthCount} evento${monthCount !== 1 ? 's' : ''} este mes`
                    : "Sin eventos próximos"}
                </Text>
              )}
            </View>
          </SquircleView>
        </Pressable>
      </Animated.View>
    );
  }
);

AgendaWidgetCard.displayName = "AgendaWidgetCard";

// Planes widget card — shows pending/completed counts
const PlanesWidgetCard = React.memo<WidgetCardProps>(
  ({ widget, index, onPress, groupId }) => {
    const theme = useTheme();
    const [pendingCount, setPendingCount] = useState(0);
    const [completedCount, setCompletedCount] = useState(0);

    useFocusEffect(
      React.useCallback(() => {
        let cancelled = false;
        const load = async () => {
          try {
            const counts = await bucketListService.getItemCounts(groupId);
            if (!cancelled) {
              setPendingCount(counts.pending);
              setCompletedCount(counts.completed);
            }
          } catch (e) {
            console.error("Error loading bucket list preview:", e);
          }
        };
        load();

        const subscription = supabase
          .channel(`group-bucketlist-realtime:${groupId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'bucket_list_items',
              filter: `group_id=eq.${groupId}`,
            },
            () => {
              load();
            }
          )
          .subscribe();

        return () => {
          cancelled = true;
          subscription.unsubscribe();
        };
      }, [groupId])
    );

    return (
      <Animated.View
        entering={FadeIn.duration(400).delay(200 + index * 80)}
        style={styles.bentoItem}
      >
        <Pressable
          onPress={() => onPress(widget)}
          style={({ pressed }) => [
            {
              opacity: pressed ? 0.92 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
        >
          <SquircleView
            style={[
              styles.widgetCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
                borderWidth: 1,
              },
            ]}
            cornerSmoothing={1}
          >
            {/* Icon */}
            <SquircleView
              style={[
                styles.widgetIconContainer,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  borderColor: theme.colors.outlineVariant,
                  borderWidth: 1,
                },
              ]}
              cornerSmoothing={1}
            >
              <Ionicons
                name={
                  (widget.widget.icon as keyof typeof Ionicons.glyphMap) ||
                  "compass-outline"
                }
                size={24}
                color="#FFFFFF"
              />
            </SquircleView>

            {/* Info */}
            <View style={styles.widgetInfo}>
              <Text
                style={[styles.widgetName, { color: theme.colors.onSurface }]}
                numberOfLines={1}
              >
                {widget.widget.name}
              </Text>
              <Text
                style={[
                  styles.widgetSubtitle,
                  { color: theme.colors.onSurfaceVariant },
                ]}
                numberOfLines={1}
              >
                {pendingCount + completedCount > 0
                  ? `${pendingCount} pendiente${pendingCount !== 1 ? 's' : ''} · ${completedCount} hecho${completedCount !== 1 ? 's' : ''}`
                  : widget.widget.subtitle || "Cosas que queréis hacer juntos"}
              </Text>
            </View>
          </SquircleView>
        </Pressable>
      </Animated.View>
    );
  }
);

PlanesWidgetCard.displayName = "PlanesWidgetCard";

// Gastos widget card — shows total spent + expense count
const GastosWidgetCard = React.memo<WidgetCardProps>(
  ({ widget, index, onPress, groupId }) => {
    const theme = useTheme();
    const [expenseCount, setExpenseCount] = useState(0);
    const [totalSpent, setTotalSpent] = useState(0);

    useFocusEffect(
      React.useCallback(() => {
        let cancelled = false;
        const load = async () => {
          try {
            const [count, total] = await Promise.all([
              sharedExpensesService.getExpenseCount(groupId),
              sharedExpensesService.getTotalSpent(groupId),
            ]);
            if (!cancelled) {
              setExpenseCount(count);
              setTotalSpent(total);
            }
          } catch (e) {
            console.error("Error loading expenses preview:", e);
          }
        };
        load();

        const subscription = supabase
          .channel(`group-expenses-realtime:${groupId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'shared_expenses',
              filter: `group_id=eq.${groupId}`,
            },
            () => { load(); }
          )
          .subscribe();

        return () => {
          cancelled = true;
          subscription.unsubscribe();
        };
      }, [groupId])
    );

    return (
      <Animated.View
        entering={FadeIn.duration(400).delay(200 + index * 80)}
        style={styles.bentoItem}
      >
        <Pressable
          onPress={() => onPress(widget)}
          style={({ pressed }) => [
            {
              opacity: pressed ? 0.92 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
        >
          <SquircleView
            style={[
              styles.widgetCard,
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
                styles.widgetIconContainer,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  borderColor: theme.colors.outlineVariant,
                  borderWidth: 1,
                },
              ]}
              cornerSmoothing={1}
            >
              <Ionicons
                name="wallet-outline"
                size={24}
                color="#FFFFFF"
              />
            </SquircleView>

            <View style={styles.widgetInfo}>
              <Text
                style={[styles.widgetName, { color: theme.colors.onSurface }]}
                numberOfLines={1}
              >
                {widget.widget.name}
              </Text>
              <Text
                style={[
                  styles.widgetSubtitle,
                  { color: theme.colors.onSurfaceVariant },
                ]}
                numberOfLines={1}
              >
                {expenseCount > 0
                  ? `${expenseCount} gasto${expenseCount !== 1 ? 's' : ''} · ${formatCents(totalSpent)}`
                  : widget.widget.subtitle || "Gastos compartidos del viaje"}
              </Text>
            </View>
          </SquircleView>
        </Pressable>
      </Animated.View>
    );
  }
);

GastosWidgetCard.displayName = "GastosWidgetCard";

// Premios widget card — shows active award counts
const PremiosWidgetCard = React.memo<WidgetCardProps>(
  ({ widget, index, onPress, groupId }) => {
    const theme = useTheme();
    const [total, setTotal] = useState(0);
    const [voting, setVoting] = useState(0);

    useFocusEffect(
      React.useCallback(() => {
        let cancelled = false;
        const load = async () => {
          try {
            const counts = await awardsService.getAwardCounts(groupId);
            if (!cancelled) {
              setTotal(counts.total);
              setVoting(counts.voting);
            }
          } catch (e) {
            console.error("Error loading awards preview:", e);
          }
        };
        load();

        const subscription = supabase
          .channel(`group-awards-realtime:${groupId}`)
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'awards',
              filter: `group_id=eq.${groupId}`,
            },
            () => { load(); }
          )
          .subscribe();

        return () => {
          cancelled = true;
          subscription.unsubscribe();
        };
      }, [groupId])
    );

    return (
      <Animated.View
        entering={FadeIn.duration(400).delay(200 + index * 80)}
        style={styles.bentoItem}
      >
        <Pressable
          onPress={() => onPress(widget)}
          style={({ pressed }) => [
            {
              opacity: pressed ? 0.92 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
        >
          <SquircleView
            style={[
              styles.widgetCard,
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
                styles.widgetIconContainer,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  borderColor: theme.colors.outlineVariant,
                  borderWidth: 1,
                },
              ]}
              cornerSmoothing={1}
            >
              <Ionicons
                name={
                  (widget.widget.icon as keyof typeof Ionicons.glyphMap) ||
                  "trophy-outline"
                }
                size={24}
                color="#FFFFFF"
              />
            </SquircleView>

            <View style={styles.widgetInfo}>
              <Text
                style={[styles.widgetName, { color: theme.colors.onSurface }]}
                numberOfLines={1}
              >
                {widget.widget.name}
              </Text>
              <Text
                style={[
                  styles.widgetSubtitle,
                  { color: theme.colors.onSurfaceVariant },
                ]}
                numberOfLines={1}
              >
                {total > 0
                  ? voting > 0
                    ? `${voting} votando · ${total} premio${total !== 1 ? 's' : ''}`
                    : `${total} premio${total !== 1 ? 's' : ''}`
                  : widget.widget.subtitle || "Premios del grupo"}
              </Text>
            </View>
          </SquircleView>
        </Pressable>
      </Animated.View>
    );
  }
);

PremiosWidgetCard.displayName = "PremiosWidgetCard";

// Flashback widget card — shows party status with rich design
const FlashbackWidgetCard = React.memo<WidgetCardProps>(
  ({ widget, index, onPress, groupId }) => {
    const theme = useTheme();
    const [status, setStatus] = useState<FlashbackPartyStatus | null>(null);
    const [remaining, setRemaining] = useState(0);
    const [partyName, setPartyName] = useState<string | null>(null);
    const [startsAt, setStartsAt] = useState<string | null>(null);
    const [photoLimit, setPhotoLimit] = useState(36);
    const [photosTaken, setPhotosTaken] = useState(0);

    useFocusEffect(
      React.useCallback(() => {
        let cancelled = false;
        const load = async () => {
          try {
            const preview = await flashbackService.getWidgetPreview(groupId);
            if (!cancelled) {
              setStatus(preview.status);
              setRemaining(preview.remaining);
              setPartyName(preview.partyName);
              setStartsAt(preview.startsAt);
              setPhotoLimit(preview.photoLimit);
              setPhotosTaken(preview.photosTaken);
            }
          } catch (e) {
            console.error("Error loading flashback preview:", e);
          }
        };
        load();
        return () => { cancelled = true; };
      }, [groupId])
    );

    const getSubtitleText = () => {
      if (!status) return "Crear fiesta";
      switch (status) {
        case "scheduled": {
          if (startsAt) {
            const d = new Date(startsAt);
            const day = d.getDate();
            const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            const h = d.getHours().toString().padStart(2, '0');
            const m = d.getMinutes().toString().padStart(2, '0');
            return `${day} ${months[d.getMonth()]} · ${h}:${m}`;
          }
          return partyName || "Empieza pronto...";
        }
        case "active":
          return null;
        case "film_used":
          return "Revelando pronto...";
        case "revealing":
          return "¡Fotos listas!";
        default:
          return "Crear fiesta";
      }
    };

    const isLive = status === "active";
    const filmRatio = photoLimit > 0 ? Math.min(photosTaken / photoLimit, 1) : 0;

    const getIconBadgeBg = () => {
      if (isLive || status === "revealing") return theme.colors.primary;
      return theme.colors.surfaceVariant;
    };

    const getIconName = (): keyof typeof Ionicons.glyphMap => {
      return "camera-outline";
    };

    return (
      <Animated.View
        entering={FadeIn.duration(400).delay(200 + index * 80)}
        style={styles.bentoItem}
      >
        <Pressable
          onPress={() => onPress(widget)}
          style={({ pressed }) => [
            {
              opacity: pressed ? 0.92 : 1,
              transform: [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
        >
          <SquircleView
            style={[
              styles.widgetCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: isLive ? theme.colors.primary : theme.colors.outlineVariant,
                borderWidth: isLive ? 2 : 1,
              },
            ]}
            cornerSmoothing={1}
          >
            {/* Top section: icon + progress */}
            <View>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <SquircleView
                  style={[
                    styles.widgetIconContainer,
                    {
                      backgroundColor: getIconBadgeBg(),
                      borderColor: isLive || status === "revealing"
                        ? "transparent"
                        : theme.colors.outlineVariant,
                      borderWidth: isLive || status === "revealing" ? 0 : 1,
                    },
                  ]}
                  cornerSmoothing={1}
                >
                  <Ionicons
                    name={getIconName()}
                    size={24}
                    color={
                      isLive || status === "revealing"
                        ? theme.colors.onPrimary
                        : theme.colors.onSurfaceVariant
                    }
                  />
                </SquircleView>

                {/* Live pulsing dot */}
                {isLive && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                    <View
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        backgroundColor: theme.colors.primary,
                      }}
                    />
                    <Text
                      style={{
                        fontFamily: "Archivo-Bold",
                        fontSize: 11,
                        color: theme.colors.primary,
                        letterSpacing: 0.5,
                      }}
                    >
                      LIVE
                    </Text>
                  </View>
                )}
              </View>

              {/* Film roll progress bar */}
              {status === "active" && (
                <View style={{ gap: 4, marginTop: 10 }}>
                  <View
                    style={{
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: theme.dark
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.06)",
                      overflow: "hidden",
                    }}
                  >
                    <View
                      style={{
                        height: "100%",
                        borderRadius: 3,
                        width: `${Math.max(filmRatio * 100, 2)}%`,
                        backgroundColor:
                          filmRatio >= 1
                            ? theme.colors.onSurfaceVariant
                            : theme.colors.primary,
                      }}
                    />
                  </View>
                  <Text
                    style={{
                      fontFamily: "Archivo-Medium",
                      fontSize: 10,
                      letterSpacing: 0.3,
                      color: theme.colors.onSurfaceVariant,
                    }}
                    numberOfLines={1}
                  >
                    {photosTaken}/{photoLimit} disparos
                  </Text>
                </View>
              )}
            </View>

            {/* Info */}
            <View style={styles.widgetInfo}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text
                  style={[styles.widgetName, { color: theme.colors.onSurface }]}
                  numberOfLines={1}
                >
                  {partyName && status !== null ? partyName : "Flashback"}
                </Text>
              </View>
              {getSubtitleText() && (
                <Text
                  style={[
                    styles.widgetSubtitle,
                    {
                      color:
                        status === "revealing"
                          ? theme.colors.primary
                          : theme.colors.onSurfaceVariant,
                    },
                  ]}
                  numberOfLines={1}
                >
                  {getSubtitleText()}
                </Text>
              )}
            </View>
          </SquircleView>
        </Pressable>
      </Animated.View>
    );
  }
);

FlashbackWidgetCard.displayName = "FlashbackWidgetCard";

// Widget Card dispatcher — chooses the right card type
const WidgetCard = React.memo<WidgetCardProps>((props) => {
  if (props.widget.widget.name === WIDGET_ARCHIVO) {
    return <ArchivoWidgetCard {...props} />;
  }
  if (props.widget.widget.name === WIDGET_AGENDA) {
    return <AgendaWidgetCard {...props} />;
  }
  if (
    props.widget.widget.name === WIDGET_PLANES ||
    props.widget.widget.name === WIDGET_PLANES_LEGACY
  ) {
    return <PlanesWidgetCard {...props} />;
  }
  if (props.widget.widget.name === WIDGET_GASTOS) {
    return <GastosWidgetCard {...props} />;
  }
  if (props.widget.widget.name === WIDGET_PREMIOS) {
    return <PremiosWidgetCard {...props} />;
  }
  if (props.widget.widget.name === WIDGET_FLASHBACK) {
    return <FlashbackWidgetCard {...props} />;
  }
  return <GenericWidgetCard {...props} />;
});

WidgetCard.displayName = "WidgetCard";

// ─── Skeleton Card ─────────────────────────────────────────────────────
interface SkeletonProps {
  index: number;
}

const SkeletonCard = React.memo<SkeletonProps>(({ index }) => {
  const theme = useTheme();
  return (
    <Animated.View
      entering={FadeIn.duration(400).delay(index * 80)}
      style={{ width: "100%" }}
    >
      <SquircleView
        style={[
          styles.skeletonBlock,
          {
            backgroundColor: theme.colors.surfaceVariant,
            borderColor: theme.colors.outlineVariant,
            borderWidth: 1,
            flexDirection: "row",
            alignItems: "center",
            paddingHorizontal: 16,
            gap: 16,
          },
        ]}
        cornerSmoothing={1}
      >
        {/* Icon placeholder */}
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 16,
            backgroundColor: theme.dark
              ? "rgba(255,255,255,0.06)"
              : "rgba(0,0,0,0.06)",
          }}
        />
        {/* Text placeholders */}
        <View style={{ flex: 1, gap: 8 }}>
          <View
            style={{
              height: 14,
              borderRadius: 7,
              width: "60%",
              backgroundColor: theme.dark
                ? "rgba(255,255,255,0.08)"
                : "rgba(0,0,0,0.06)",
            }}
          />
          <View
            style={{
              height: 12,
              borderRadius: 6,
              width: "40%",
              backgroundColor: theme.dark
                ? "rgba(255,255,255,0.05)"
                : "rgba(0,0,0,0.04)",
            }}
          />
        </View>
      </SquircleView>
    </Animated.View>
  );
});

SkeletonCard.displayName = "SkeletonCard";

// ─── Main Screen ───────────────────────────────────────────────────────
export default function GroupDetailScreen() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const { user } = useAuth();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showMembersBottomSheet, setShowMembersBottomSheet] = useState(false);

  const [dialogConfig, setDialogConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: DialogType;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  }>({
    visible: false,
    title: "",
    message: "",
    type: "info",
    onConfirm: () => { },
  });

  const [optionsMenu, setOptionsMenu] = useState<{
    visible: boolean;
    title: string;
    options: MenuOption[];
  }>({
    visible: false,
    title: "",
    options: [],
  });

  const hideDialog = () =>
    setDialogConfig((prev) => ({ ...prev, visible: false }));
  const hideOptionsMenu = () =>
    setOptionsMenu((prev) => ({ ...prev, visible: false }));

  const backgroundRef = React.useRef(null);

  const {
    group,
    isLoading,
    error,
    refetch,
    isAdmin,
    isOwner,
  } = useGroup(id);

  const canManageWidgets =
    isAdmin || (group?.settings?.allow_member_manage_widgets ?? false);

  const [widgets, setWidgets] = useState<GroupWidgetWithDetails[]>([]);
  const [isLoadingWidgets, setIsLoadingWidgets] = useState(true);

  const fetchWidgets = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoadingWidgets(true);
      const data = await widgetsService.getGroupWidgets(id as string);
      setWidgets(data);
    } catch (e) {
      console.error("Error loading widgets", e);
    } finally {
      setIsLoadingWidgets(false);
    }
  }, [id]);

  useFocusEffect(
    React.useCallback(() => {
      refetch();
      fetchWidgets();
    }, [refetch, fetchWidgets])
  );

  const handleWidgetPress = useCallback((widget: GroupWidgetWithDetails) => {
    if (widget.widget.name === "Archivo") {
      router.push({
        pathname: "/groups/group/gallery",
        params: { id },
      } as any);
      return;
    }
    if (widget.widget.name === "Bloc") {
      router.push({
        pathname: "/groups/group/bloc",
        params: { id },
      } as any);
      return;
    }
    if (widget.widget.name === "Agenda") {
      router.push({
        pathname: "/groups/group/calendar",
        params: { id },
      } as any);
      return;
    }
    if (
      widget.widget.name === WIDGET_PLANES ||
      widget.widget.name === WIDGET_PLANES_LEGACY
    ) {
      router.push({
        pathname: "/groups/group/bucketList",
        params: { id },
      } as any);
      return;
    }
    if (widget.widget.name === WIDGET_GASTOS) {
      router.push({
        pathname: "/groups/group/sharedExpenses",
        params: { id },
      } as any);
      return;
    }
    if (widget.widget.name === WIDGET_PREMIOS) {
      router.push({
        pathname: "/groups/group/awards",
        params: { id },
      } as any);
      return;
    }
    if (widget.widget.name === WIDGET_FLASHBACK) {
      router.push({
        pathname: "/groups/group/flashback",
        params: { id },
      } as any);
      return;
    }
    showSnackbar("Próximamente", "info");
  }, [router, id, showSnackbar]);

  const handleAddWidget = useCallback(() => {
    if (!canManageWidgets) {
      showSnackbar("Solo los administradores pueden gestionar widgets", "info");
      return;
    }
    router.push({
      pathname: "/groups/group/widgets",
      params: { id },
    } as any);
  }, [canManageWidgets, showSnackbar, router, id]);

  const handleMembersPress = useCallback(() => {
    if (!group) return;
    // If there's a members screen, navigate to it; otherwise open invite modal
    setShowInviteModal(true);
  }, [group]);

  const handleInvite = useCallback(() => {
    setShowInviteModal(true);
  }, []);

  // Loading state
  if (isLoading && !group) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View
          style={[styles.container, { backgroundColor: theme.colors.background }]}
        >
          <CustomHeader title="" showBackButton={true} />
          <View style={styles.loadingContent}>
            {[0, 1, 2].map((i) => (
              <SkeletonCard key={i} index={i} />
            ))}
          </View>
        </View>
      </>
    );
  }

  // Error state
  if (error || !group) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View
          style={[styles.container, { backgroundColor: theme.colors.background }]}
        >
          <CustomHeader title="" showBackButton={true} />
          <View style={styles.errorContent}>
            <SquircleView
              style={[
                styles.errorIconContainer,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                },
              ]}
              cornerSmoothing={1}
            >
              <Ionicons
                name="warning-outline"
                size={36}
                color={theme.colors.onSurfaceVariant}
              />
            </SquircleView>
            <Text
              style={[
                styles.errorTitle,
                { color: theme.colors.onSurface },
              ]}
            >
              {error ? "Error al cargar" : "Grupo no encontrado"}
            </Text>
            <Text
              style={[
                styles.errorSubtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {error
                ? "No se pudo cargar el grupo. Inténtalo de nuevo."
                : "Este grupo ya no existe o no tienes acceso."}
            </Text>
            <Pressable
              onPress={() => router.back()}
              style={({ pressed }) => [
                { opacity: pressed ? 0.9 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
              ]}
            >
              <SquircleView
                style={[
                  styles.errorButton,
                  { backgroundColor: theme.colors.primary },
                ]}
                cornerSmoothing={1}
              >
                <Text
                  style={[
                    styles.errorButtonText,
                    { color: theme.colors.onPrimary },
                  ]}
                >
                  Volver
                </Text>
              </SquircleView>
            </Pressable>
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <BlurTargetView ref={backgroundRef} style={styles.container}>
        <CustomHeader
          title=""
          showBackButton={true}
          rightAction={
            isAdmin ? (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/groups/group/settings",
                    params: { id },
                  })
                }
              >
                <Ionicons
                  name="settings-outline"
                  size={24}
                  color={theme.colors.onSurface}
                />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => setShowMembersBottomSheet(true)}
              >
                <Ionicons
                  name="people-outline"
                  size={24}
                  color={theme.colors.onSurface}
                />
              </TouchableOpacity>
            )
          }
        />

        <View
          style={[styles.container, { backgroundColor: theme.colors.background }]}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.content,
              { paddingBottom: 120 + insets.bottom },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {/* ─── Group Header ─── */}
            <Animated.View
              entering={FadeIn.duration(500)}
              style={styles.header}
            >
              {/* Icon + Name */}
              <View style={styles.headerTitleRow}>
                <UserAvatar
                  uri={group.cover_image_url}
                  name={group.name}
                  size={64}
                  borderRadius={16}
                />
              </View>

              <Text
                style={[styles.groupName, { color: theme.colors.primary }]}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {group.name}
              </Text>

              {/* Divider */}
              <View
                style={[
                  styles.headerDivider,
                  { backgroundColor: theme.colors.outlineVariant },
                ]}
              />

              {/* Description */}
              <Text
                style={[
                  styles.groupDescription,
                  { color: theme.colors.onSurfaceVariant },
                ]}
                numberOfLines={2}
              >
                {group.description || "Tu espacio privado para organizaros juntos."}
              </Text>
            </Animated.View>

            {/* ─── Members Row ─── */}
            <Animated.View entering={FadeIn.duration(400).delay(100)}>
              <Pressable
                onPress={handleMembersPress}
                style={({ pressed }) => [
                  styles.membersRow,
                  {
                    opacity: pressed ? 0.85 : 1,
                    transform: [{ scale: pressed ? 0.99 : 1 }],
                  },
                ]}
              >
                <MemberAvatarsRow
                  users={group.members}
                  max={5}
                  size="sm"
                />
                <View style={styles.membersTextBlock}>
                  <Text
                    style={[
                      styles.membersCount,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    {group.member_count}{" "}
                    {group.member_count === 1 ? "miembro" : "miembros"}
                  </Text>
                  <Text
                    style={[
                      styles.membersAction,
                      { color: theme.colors.primary },
                    ]}
                  >
                    + Invitar
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={theme.colors.onSurfaceVariant}
                />
              </Pressable>
            </Animated.View>

            {/* ─── Section Divider ─── */}
            <Animated.View
              entering={FadeIn.duration(400).delay(150)}
              style={[
                styles.sectionDivider,
                { backgroundColor: theme.colors.outlineVariant },
              ]}
            />

            {/* ─── Widgets Grid ─── */}
            {widgets.length > 0 ? (
              <View style={styles.bentoGrid}>
                {widgets.map((widget, index) => (
                  <WidgetCard
                    key={widget.id}
                    widget={widget}
                    index={index}
                    onPress={handleWidgetPress}
                    groupId={id as string}
                  />
                ))}

                {/* Add Widget Card — managers only */}
                {canManageWidgets && (
                  <Animated.View
                    entering={FadeIn.duration(400).delay(
                      200 + widgets.length * 80
                    )}
                    style={{ width: "100%" }}
                  >
                    <Pressable
                      onPress={handleAddWidget}
                      style={({ pressed }) => [
                        {
                          opacity: pressed ? 0.8 : 1,
                          transform: [{ scale: pressed ? 0.98 : 1 }],
                        },
                      ]}
                    >
                      <SquircleView
                        style={[
                          styles.addWidgetCard,
                          {
                            borderColor: theme.colors.onSurfaceVariant,
                            borderWidth: 2,
                          },
                        ]}
                        cornerSmoothing={1}
                      >
                        <SquircleView
                          style={[
                            styles.addWidgetIconContainer,
                            {
                              backgroundColor: theme.colors.surfaceVariant,
                              borderColor: theme.colors.outlineVariant,
                              borderWidth: 1,
                            },
                          ]}
                          cornerSmoothing={1}
                        >
                          <Ionicons
                            name="add"
                            size={24}
                            color="#FFFFFF"
                          />
                        </SquircleView>
                        <View>
                          <Text
                            style={[
                              styles.addWidgetTitle,
                              { color: theme.colors.onSurfaceVariant },
                            ]}
                          >
                            Explorar widgets
                          </Text>
                          <Text
                            style={[
                              styles.addWidgetSubtitle,
                              { color: theme.colors.outline },
                            ]}
                          >
                            Personaliza tu grupo
                          </Text>
                        </View>
                      </SquircleView>
                    </Pressable>
                  </Animated.View>
                )}
              </View>
            ) : (
              /* ─── Empty Widget State ─── */
              <Animated.View
                entering={FadeIn.duration(500).delay(200)}
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
                        borderColor: theme.colors.outline,
                        borderWidth: 1,
                      },
                    ]}
                    cornerSmoothing={1}
                  >
                    <Ionicons
                      name="grid-outline"
                      size={36}
                      color="#FFFFFF"
                    />
                  </SquircleView>

                  <Text
                    style={[
                      styles.emptyTitle,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    Personaliza tu grupo
                  </Text>
                  <Text
                    style={[
                      styles.emptySubtitle,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {canManageWidgets
                      ? "Añade widgets para organizar tu grupo a tu manera. Gastos, galería, tareas y mucho más."
                      : "El administrador del grupo aún no ha añadido widgets."}
                  </Text>

                  {canManageWidgets && (
                    <Pressable
                      onPress={handleAddWidget}
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
                          Explorar widgets
                        </Text>
                      </SquircleView>
                    </Pressable>
                  )}
                </SquircleView>
              </Animated.View>
            )}
          </ScrollView>

          {/* Invite Modal */}
          <InviteModal
            visible={showInviteModal}
            onClose={() => setShowInviteModal(false)}
            inviteCode={group.invite_code}
            groupName={group.name}
          />

          {/* Members List Bottom Sheet */}
          <MemberListBottomSheet
            visible={showMembersBottomSheet}
            onDismiss={() => setShowMembersBottomSheet(false)}
            members={group.members}
          />
        </View>
      </BlurTargetView>

      <OptionsMenu
        visible={optionsMenu.visible}
        title={optionsMenu.title}
        options={optionsMenu.options}
        onDismiss={hideOptionsMenu}
      />
      <ConfirmDialog
        visible={dialogConfig.visible}
        title={dialogConfig.title}
        message={dialogConfig.message}
        type={dialogConfig.type}
        confirmText={dialogConfig.confirmText}
        cancelText={dialogConfig.cancelText}
        onConfirm={dialogConfig.onConfirm}
        onCancel={hideDialog}
        showCancel={true}
        blurTargetRef={backgroundRef}
      />
    </>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 0,
  },

  // Loading
  loadingContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    gap: 16,
  },
  skeletonBlock: {
    height: 80,
    borderRadius: 22,
  },

  // Error
  errorContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 36,
  },
  errorIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  errorTitle: {
    fontFamily: "Archivo-Bold",
    fontSize: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  errorSubtitle: {
    fontFamily: "Archivo-Medium",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  errorButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 16,
  },
  errorButtonText: {
    fontFamily: "Archivo-Bold",
    fontSize: 16,
  },

  // Header
  header: {
    marginBottom: 20,
    marginTop: 4,
  },
  headerTitleRow: {
    marginBottom: 12,
  },
  groupIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  groupName: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 34,
    letterSpacing: 0.5,
    lineHeight: 40,
  },
  headerDivider: {
    height: 1,
    width: "50%",
    marginTop: 6,
    marginBottom: 10,
  },
  groupDescription: {
    fontFamily: "Archivo-Medium",
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: 0.3,
  },

  // Members Row
  membersRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  membersTextBlock: {
    flex: 1,
    marginLeft: 2,
  },
  membersCount: {
    fontFamily: "Archivo-Bold",
    fontSize: 14,
  },
  membersAction: {
    fontFamily: "Archivo-Medium",
    fontSize: 12,
    letterSpacing: 0.3,
    marginTop: 1,
  },

  // Section Divider
  sectionDivider: {
    height: 1,
    marginBottom: 20,
  },

  // Bento Grid
  bentoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: CARD_GAP,
  },
  bentoItem: {
    width: CARD_WIDTH,
  },
  bentoItemWide: {
    width: "100%",
  },

  // Archivo (Gallery) Card — 2x1
  archivoCard: {
    borderRadius: 22,
    height: 140,
    overflow: "hidden",
  },
  archivoContent: {
    flex: 1,
    padding: 16,
    justifyContent: "space-between",
    zIndex: 1,
  },
  archivoIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  archivoTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  archivoStorageBlock: {
    flex: 1,
    gap: 4,
  },
  archivoStorageBarBg: {
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
  },
  archivoStorageBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  archivoStorageLabel: {
    fontFamily: "Archivo-Medium",
    fontSize: 10,
    letterSpacing: 0.3,
  },
  archivoTextBlock: {
    gap: 2,
  },
  archivoTitle: {
    fontFamily: "Archivo-Bold",
    fontSize: 17,
    letterSpacing: 0.2,
  },
  archivoSubtitle: {
    fontFamily: "Archivo-Medium",
    fontSize: 13,
    letterSpacing: 0.1,
  },

  // Widget Card
  widgetCard: {
    borderRadius: 22,
    padding: 16,
    aspectRatio: 1,
    justifyContent: "space-between",
  },
  widgetIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  widgetInfo: {
    flex: 1,
    justifyContent: "flex-end",
    marginTop: 8,
  },
  widgetName: {
    fontFamily: "Archivo-Bold",
    fontSize: 15,
    lineHeight: 20,
    marginBottom: 2,
  },
  widgetSubtitle: {
    fontFamily: "Archivo-Medium",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
    marginTop: 2,
  },
  agendaDate: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 11,
    letterSpacing: 0.2,
    marginTop: 2,
  },

  // Add Widget Card
  addWidgetCard: {
    borderRadius: 22,
    borderStyle: "dashed",
    backgroundColor: "transparent",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 14,
  },
  addWidgetIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  addWidgetTitle: {
    fontFamily: "Archivo-Bold",
    fontSize: 14,
  },
  addWidgetSubtitle: {
    fontFamily: "Archivo-Medium",
    fontSize: 12,
    marginTop: 1,
  },

  // Empty State
  emptyContainer: {
    marginTop: 8,
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
});
