/**
 * Inicio del grupo con widgets
 * Dashboard principal del grupo
 */
import { InviteModal } from "@/components/InviteModal";
import { MemberAvatarsRow } from "@/components/MemberAvatar";
import { MemberListBottomSheet } from "@/components/MemberListBottomSheet";
import { CircleButton } from "@/components/ui/CircleButton";
import { CTAButton } from "@/components/ui/CTAButton";
import { GroupCover } from "@/components/ui/GroupCover";
import {
  useWidgetTone,
  WidgetTone,
  WidgetWatermark,
} from "@/components/widgets/visuals";
import { StatusView } from "@/components/ui/StatusView";
import { useAuth, useGroup } from "@/hooks";
import { computeBalances, formatCents } from "@/lib/sharedExpenses";
import { getOptimizedMediaUrl } from "@/lib/storage";
import { supabase } from "@/lib/supabase";
import { awardsService } from "@/services/awards.service";
import { bucketListService } from "@/services/bucketList.service";
import { eventsService } from "@/services/events.service";
import { flashbackService } from "@/services/flashback.service";
import { galleryService } from "@/services/gallery.service";
import { notesService } from "@/services/notes.service";
import { sharedExpensesService } from "@/services/sharedExpenses.service";
import { widgetsService } from "@/services/widgets.service";
import {
  Award,
  CalendarEvent,
  FlashbackPartyStatus,
  GroupWidgetWithDetails,
} from "@/types/database";
import { Ionicons } from "@expo/vector-icons";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import { useFocusEffect } from "expo-router/react-navigation";
import { Image } from "expo-image";
import { Stack, useGlobalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Text, useTheme } from "react-native-paper";
import Animated, { FadeIn } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { ConfirmDialog, DialogType } from "@/components/ui/ConfirmDialog";
import { MenuOption, OptionsMenu } from "@/components/ui/OptionsMenu";
import { useSnackbar } from "@/components/ui/SnackbarContext";
import { BlurTargetView } from "expo-blur";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_GAP = 14;
const CARD_WIDTH = (SCREEN_WIDTH - 24 * 2 - CARD_GAP) / 2;

// Liquid Glass solo existe en iOS 26+; en el resto los controles son superficies opacas.
const glassAvailable = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

// Alto de la barra flotante bajo el área segura: margen, botón y aire hasta el contenido
const TOP_BAR_HEIGHT = 8 + 44 + 16;

const WIDGET_ARCHIVO = "Archivo";
const WIDGET_AGENDA = "Agenda";
const WIDGET_BLOC = "Bloc";
const WIDGET_PLANES = "Planes";
const WIDGET_GASTOS = "Gastos";
const WIDGET_PREMIOS = "Premios";
const WIDGET_FLASHBACK = "Flashback";

// Widgets que ocupan todo el ancho de la cuadrícula
const WIDE_WIDGETS = new Set([WIDGET_ARCHIVO, WIDGET_AGENDA]);

interface WidgetCardProps {
  widget: GroupWidgetWithDetails;
  index: number;
  onPress: (widget: GroupWidgetWithDetails) => void;
  groupId: string;
}

const STORAGE_LIMIT_BYTES = 1 * 1024 * 1024 * 1024; // 1 GB

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const WEEKDAYS_SHORT = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

const startOfDay = (date: Date): number =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();

// "Hoy · 21:00", "Mañana · Todo el día", "Sáb 18 · 20:30"
const formatEventWhen = (event: CalendarEvent): string => {
  const date = new Date(event.starts_at);
  const days = Math.round(
    (startOfDay(date) - startOfDay(new Date())) / (24 * 60 * 60 * 1000),
  );
  const day =
    days === 0
      ? "Hoy"
      : days === 1
        ? "Mañana"
        : `${WEEKDAYS_SHORT[date.getDay()]} ${date.getDate()}`;

  return `${day} · ${event.is_all_day ? "Todo el día" : formatTime(date)}`;
};

const formatTimeLeft = (endsAt: string | null): string => {
  if (!endsAt) return "Votación abierta";

  const hours = Math.floor(
    (new Date(endsAt).getTime() - Date.now()) / (60 * 60 * 1000),
  );
  if (hours < 0) return "Votación cerrándose";
  if (hours < 1) return "Queda menos de 1 hora";
  if (hours < 24) return `${plural(hours, "Queda", "Quedan")} ${hours} h`;

  const days = Math.floor(hours / 24);
  return `${plural(days, "Queda", "Quedan")} ${days} ${plural(days, "día", "días")}`;
};

const MONTHS_SHORT = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

const formatTime = (date: Date): string =>
  `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;

const plural = (count: number, singular: string, pluralForm: string) =>
  count === 1 ? singular : pluralForm;

interface WidgetShellProps {
  index: number;
  icon: keyof typeof Ionicons.glyphMap;
  name: string;
  onPress: () => void;
  /** Resumen del contenido para el lector de pantalla. */
  summary?: string;
  /** Resalta la tarjeta y su icono. */
  highlighted?: boolean;
  /** Hace más visible el icono de fondo; por defecto acompaña a `highlighted`. */
  iconEmphasized?: boolean;
  /** Elemento en la esquina superior izquierda. */
  accessory?: React.ReactNode;
  /** Color propio del widget; sin él se usa el verde de la marca. */
  tone?: WidgetTone;
  /** Texto visible sobre el contenido; por defecto, el nombre del widget. */
  label?: string;
  /** Pinta la etiqueta con el color del widget: hay algo en curso. */
  labelAccent?: boolean;
  /** Ocupa todo el ancho, con el nombre arriba. */
  wide?: boolean;
  children: React.ReactNode;
}

// Tarjeta común a todos los widgets: icono translúcido de fondo y, encima, etiqueta y contenido
function WidgetShell({
  index,
  icon,
  name,
  onPress,
  summary,
  highlighted = false,
  iconEmphasized = highlighted,
  accessory,
  tone,
  label = name,
  labelAccent = false,
  wide = false,
  children,
}: WidgetShellProps) {
  const theme = useTheme();
  // Los hooks no admiten llamadas condicionales: se pide una paleta siempre y se usa solo si hay tono
  const tonePalette = useWidgetTone(tone ?? "green");
  const palette = tone ? tonePalette : undefined;
  const accent = palette?.accent ?? theme.colors.primary;

  const labelText = (
    <Text
      style={[
        styles.widgetName,
        {
          color:
            palette && labelAccent
              ? palette.text
              : theme.colors.onSurfaceVariant,
        },
      ]}
      numberOfLines={1}
    >
      {wide ? name : label}
    </Text>
  );

  return (
    <Animated.View
      entering={FadeIn.duration(400).delay(200 + index * 80)}
      style={wide ? styles.bentoItemWide : styles.bentoItem}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={summary ? `${name}. ${summary}` : name}
        style={({ pressed }) => [
          {
            opacity: pressed ? 0.92 : 1,
            transform: [{ scale: pressed ? 0.97 : 1 }],
          },
        ]}
      >
        <SquircleView
          style={[
            wide ? styles.widgetCardWide : styles.widgetCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: highlighted ? accent : theme.colors.outlineVariant,
              borderWidth: highlighted ? 2 : 1,
            },
          ]}
          cornerSmoothing={1}
        >
          <WidgetWatermark
            icon={icon}
            color={accent}
            emphasized={iconEmphasized}
            wide={wide}
          />

          <View style={styles.widgetHeader}>
            {wide && labelText}
            {accessory}
          </View>

          {wide ? (
            children
          ) : (
            <View style={styles.widgetBody}>
              {labelText}
              {children}
            </View>
          )}
        </SquircleView>
      </Pressable>
    </Animated.View>
  );
}

interface WidgetTextProps {
  children: React.ReactNode;
  color?: string;
}

// Dato principal del widget
function WidgetValue({ children, color }: WidgetTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[styles.widgetValue, { color: color ?? theme.colors.onSurface }]}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.7}
    >
      {children}
    </Text>
  );
}

// Línea de apoyo bajo el dato principal
function WidgetDetail({ children, color }: WidgetTextProps) {
  const theme = useTheme();

  return (
    <Text
      style={[
        styles.widgetDetail,
        { color: color ?? theme.colors.onSurfaceVariant },
      ]}
      numberOfLines={1}
    >
      {children}
    </Text>
  );
}

const ArchivoWidgetCard = React.memo<WidgetCardProps>(
  ({ widget, index, onPress, groupId }) => {
    const theme = useTheme();
    const [photos, setPhotos] = useState<string[]>([]);
    const [imageCount, setImageCount] = useState(0);
    const [storageUsed, setStorageUsed] = useState(0);

    useFocusEffect(
      React.useCallback(() => {
        let cancelled = false;
        const load = async () => {
          try {
            const [latest, count, used] = await Promise.all([
              galleryService.getLatestImages(groupId, 3),
              galleryService.getImageCount(groupId),
              galleryService.getStorageUsed(groupId),
            ]);
            if (!cancelled) {
              setPhotos(latest);
              setImageCount(count);
              setStorageUsed(used);
            }
          } catch {}
        };
        load();
        return () => {
          cancelled = true;
        };
      }, [groupId]),
    );

    const storageRatio = Math.min(storageUsed / STORAGE_LIMIT_BYTES, 1);
    const storageLabel = `${formatBytes(storageUsed)} / 1 GB`;
    const photosLabel =
      imageCount > 0
        ? `${imageCount} ${plural(imageCount, "foto", "fotos")}`
        : "Galería compartida";

    // Mosaico: la última foto en grande y las dos anteriores apiladas a su lado
    const [mainPhoto, ...sidePhotos] = photos;
    // Sobre una foto todo va en blanco; sin foto, con los colores del tema
    const onPhoto = !!mainPhoto;

    return (
      <Animated.View
        entering={FadeIn.duration(400).delay(200 + index * 80)}
        style={styles.bentoItemWide}
      >
        <Pressable
          onPress={() => onPress(widget)}
          accessibilityRole="button"
          accessibilityLabel={`Archivo. ${photosLabel}. ${storageLabel}`}
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
              !onPhoto && {
                backgroundColor: theme.colors.surface,
                borderColor: theme.colors.outlineVariant,
                borderWidth: 1,
              },
            ]}
            cornerSmoothing={1}
          >
            <View style={styles.archivoMain}>
              {!onPhoto && (
                <WidgetWatermark
                  icon="images-outline"
                  color={theme.colors.primary}
                  wide
                />
              )}
              {mainPhoto && (
                <>
                  <Image
                    source={
                      getOptimizedMediaUrl(mainPhoto, { width: 800 }) ||
                      mainPhoto
                    }
                    style={StyleSheet.absoluteFill}
                    contentFit="cover"
                    transition={300}
                  />
                  <View
                    style={[StyleSheet.absoluteFill, styles.archivoScrim]}
                  />
                </>
              )}

              <View style={styles.archivoContent}>
                <View style={styles.archivoTopRow}>
                  <View style={styles.archivoStorageBlock}>
                    <View
                      style={[
                        styles.archivoStorageBarBg,
                        {
                          backgroundColor: onPhoto
                            ? "rgba(255,255,255,0.25)"
                            : theme.colors.outlineVariant,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.archivoStorageBarFill,
                          {
                            width: `${Math.max(storageRatio * 100, 2)}%`,
                            backgroundColor:
                              storageRatio > 0.9
                                ? "#FF6B6B"
                                : storageRatio > 0.7
                                  ? "#FFA726"
                                  : onPhoto
                                    ? "rgba(255,255,255,0.9)"
                                    : theme.colors.primary,
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.archivoStorageLabel,
                        {
                          color: onPhoto
                            ? "rgba(255,255,255,0.85)"
                            : theme.colors.onSurfaceVariant,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {storageLabel}
                    </Text>
                  </View>
                </View>

                <View>
                  <Text
                    style={[
                      styles.widgetName,
                      {
                        color: onPhoto
                          ? "rgba(255,255,255,0.85)"
                          : theme.colors.onSurfaceVariant,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    Archivo
                  </Text>
                  <WidgetValue color={onPhoto ? "#FFFFFF" : undefined}>
                    {photosLabel}
                  </WidgetValue>
                </View>
              </View>
            </View>

            {sidePhotos.length > 0 && (
              <View style={styles.archivoSide}>
                {sidePhotos.map((photo) => (
                  <Image
                    key={photo}
                    source={
                      getOptimizedMediaUrl(photo, { width: 400 }) || photo
                    }
                    style={styles.archivoSidePhoto}
                    contentFit="cover"
                    transition={300}
                  />
                ))}
              </View>
            )}
          </SquircleView>
        </Pressable>
      </Animated.View>
    );
  },
);

ArchivoWidgetCard.displayName = "ArchivoWidgetCard";

// Tarjeta para cualquier widget que no tenga una propia
const GenericWidgetCard = React.memo<WidgetCardProps>(
  ({ widget, index, onPress }) => {
    const palette = useWidgetTone("pink");

    return (
      <WidgetShell
        index={index}
        icon={
          (widget.widget.icon as keyof typeof Ionicons.glyphMap) ||
          "grid-outline"
        }
        name={widget.widget.name}
        tone="pink"
        summary={widget.widget.subtitle ?? undefined}
        onPress={() => onPress(widget)}
      >
        {!!widget.widget.subtitle && (
          <Text
            style={[styles.widgetEmpty, { color: palette.strong }]}
            numberOfLines={2}
          >
            {widget.widget.subtitle}
          </Text>
        )}
      </WidgetShell>
    );
  },
);

GenericWidgetCard.displayName = "GenericWidgetCard";

const BlocWidgetCard = React.memo<WidgetCardProps>(
  ({ widget, index, onPress, groupId }) => {
    const palette = useWidgetTone("pink");
    const [noteCount, setNoteCount] = useState(0);
    // La primera de la lista: la fijada o, si no hay, la última editada
    const [topNote, setTopNote] = useState<{
      title: string;
      pinned: boolean;
    } | null>(null);

    useFocusEffect(
      React.useCallback(() => {
        let cancelled = false;
        const load = async () => {
          try {
            const notes = await notesService.getNotes(groupId);
            if (!cancelled) {
              setNoteCount(notes.length);
              setTopNote(
                notes[0]
                  ? { title: notes[0].title, pinned: notes[0].is_pinned }
                  : null,
              );
            }
          } catch {}
        };
        load();
        return () => {
          cancelled = true;
        };
      }, [groupId]),
    );

    const countLabel = `${noteCount} ${plural(noteCount, "nota", "notas")}`;
    const noteTitle = topNote?.title.trim() || "Sin título";
    const noteDetail = topNote?.pinned ? "nota fijada" : "última nota";
    const emptyText = widget.widget.subtitle || "Listas colaborativas";

    return (
      <WidgetShell
        index={index}
        icon={
          (widget.widget.icon as keyof typeof Ionicons.glyphMap) ||
          "checkbox-outline"
        }
        name={widget.widget.name}
        tone="pink"
        label={topNote ? countLabel : widget.widget.name}
        summary={
          topNote ? `${countLabel}. ${noteDetail}: ${noteTitle}` : emptyText
        }
        onPress={() => onPress(widget)}
      >
        {topNote ? (
          <>
            <Text
              style={[styles.widgetTitle, { color: palette.strong }]}
              numberOfLines={2}
            >
              {noteTitle}
            </Text>
            <WidgetDetail color={palette.soft}>{noteDetail}</WidgetDetail>
          </>
        ) : (
          <Text
            style={[styles.widgetEmpty, { color: palette.strong }]}
            numberOfLines={2}
          >
            {emptyText}
          </Text>
        )}
      </WidgetShell>
    );
  },
);

BlocWidgetCard.displayName = "BlocWidgetCard";

const AgendaWidgetCard = React.memo<WidgetCardProps>(
  ({ widget, index, onPress, groupId }) => {
    const palette = useWidgetTone("coral");
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [monthCount, setMonthCount] = useState(0);

    useFocusEffect(
      React.useCallback(() => {
        let cancelled = false;
        const load = async () => {
          try {
            const [upcoming, count] = await Promise.all([
              eventsService.getUpcomingEvents(groupId, 2),
              eventsService.getMonthEventCount(groupId),
            ]);
            if (!cancelled) {
              setEvents(upcoming);
              setMonthCount(count);
            }
          } catch {}
        };
        load();

        const subscription = supabase
          .channel(`group-agenda-realtime:${groupId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "events",
              filter: `group_id=eq.${groupId}`,
            },
            () => {
              load();
            },
          )
          .subscribe();

        return () => {
          cancelled = true;
          subscription.unsubscribe();
        };
      }, [groupId]),
    );

    // La fecha grande es la del próximo evento; sin eventos, la de hoy
    const anchor = events[0] ? new Date(events[0].starts_at) : new Date();
    const emptyDetail =
      monthCount > 0
        ? `${monthCount} ${plural(monthCount, "evento", "eventos")} este mes`
        : "Toca para añadir uno";

    return (
      <WidgetShell
        index={index}
        icon="calendar-outline"
        name="Agenda"
        tone="coral"
        wide
        summary={
          events.length > 0
            ? events
                .map((event) => `${event.title}, ${formatEventWhen(event)}`)
                .join(". ")
            : `Sin eventos próximos. ${emptyDetail}`
        }
        onPress={() => onPress(widget)}
      >
        <View style={styles.agendaRow}>
          <View style={styles.agendaDateBlock}>
            <Text style={[styles.agendaMonth, { color: palette.text }]}>
              {MONTHS_SHORT[anchor.getMonth()].toUpperCase()}
            </Text>
            <Text
              maxFontSizeMultiplier={1.2}
              style={[styles.agendaDay, { color: palette.strong }]}
            >
              {anchor.getDate()}
            </Text>
          </View>

          <View style={styles.agendaEvents}>
            {events.length > 0 ? (
              events.map((event) => (
                <View key={event.id}>
                  <Text
                    style={[styles.agendaEventTitle, { color: palette.strong }]}
                    numberOfLines={1}
                  >
                    {event.title}
                  </Text>
                  <WidgetDetail color={palette.soft}>
                    {formatEventWhen(event)}
                  </WidgetDetail>
                </View>
              ))
            ) : (
              <View>
                <Text
                  style={[styles.agendaEventTitle, { color: palette.strong }]}
                  numberOfLines={1}
                >
                  Sin eventos próximos
                </Text>
                <WidgetDetail color={palette.soft}>{emptyDetail}</WidgetDetail>
              </View>
            )}
          </View>
        </View>
      </WidgetShell>
    );
  },
);

AgendaWidgetCard.displayName = "AgendaWidgetCard";

const PlanesWidgetCard = React.memo<WidgetCardProps>(
  ({ widget, index, onPress, groupId }) => {
    const palette = useWidgetTone("blue");
    const [pendingCount, setPendingCount] = useState(0);
    const [completedCount, setCompletedCount] = useState(0);
    const [nextPlan, setNextPlan] = useState<string | null>(null);

    useFocusEffect(
      React.useCallback(() => {
        let cancelled = false;
        const load = async () => {
          try {
            const [counts, pending] = await Promise.all([
              bucketListService.getItemCounts(groupId),
              bucketListService.getItems(groupId, { isCompleted: false }),
            ]);
            if (!cancelled) {
              setPendingCount(counts.pending);
              setCompletedCount(counts.completed);
              setNextPlan(pending[0]?.title ?? null);
            }
          } catch {}
        };
        load();

        const subscription = supabase
          .channel(`group-bucketlist-realtime:${groupId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "bucket_list_items",
              filter: `group_id=eq.${groupId}`,
            },
            () => {
              load();
            },
          )
          .subscribe();

        return () => {
          cancelled = true;
          subscription.unsubscribe();
        };
      }, [groupId]),
    );

    const total = pendingCount + completedCount;
    const progressLabel = `${completedCount} de ${total} ${plural(completedCount, "hecho", "hechos")}`;
    const emptyText =
      widget.widget.subtitle || "Cosas que queréis hacer juntos";

    return (
      <WidgetShell
        index={index}
        icon={
          (widget.widget.icon as keyof typeof Ionicons.glyphMap) ||
          "compass-outline"
        }
        name={widget.widget.name}
        tone="blue"
        label={total > 0 ? progressLabel : widget.widget.name}
        summary={
          total > 0
            ? `${progressLabel}. ${nextPlan ? `Siguiente: ${nextPlan}` : "Todo hecho"}`
            : emptyText
        }
        onPress={() => onPress(widget)}
      >
        {total > 0 ? (
          <>
            <View
              style={[styles.widgetBarBg, { backgroundColor: palette.chip }]}
            >
              <View
                style={[
                  styles.widgetBarFill,
                  {
                    width: `${Math.max((completedCount / total) * 100, 2)}%`,
                    backgroundColor: palette.accent,
                  },
                ]}
              />
            </View>
            <Text
              style={[styles.widgetTitle, { color: palette.strong }]}
              numberOfLines={2}
            >
              {nextPlan ?? "¡Todo hecho!"}
            </Text>
            <WidgetDetail color={palette.soft}>
              {nextPlan ? "siguiente plan" : "no queda nada pendiente"}
            </WidgetDetail>
          </>
        ) : (
          <Text
            style={[styles.widgetEmpty, { color: palette.strong }]}
            numberOfLines={2}
          >
            {emptyText}
          </Text>
        )}
      </WidgetShell>
    );
  },
);

PlanesWidgetCard.displayName = "PlanesWidgetCard";

const GastosWidgetCard = React.memo<WidgetCardProps>(
  ({ widget, index, onPress, groupId }) => {
    const palette = useWidgetTone("green");
    const { user } = useAuth();
    const userId = user?.id;
    const [expenseCount, setExpenseCount] = useState(0);
    const [totalSpent, setTotalSpent] = useState(0);
    // Saldo propio en céntimos: positivo si te deben, negativo si debes
    const [myBalance, setMyBalance] = useState(0);

    useFocusEffect(
      React.useCallback(() => {
        let cancelled = false;
        const load = async () => {
          try {
            const [expenses, settlements] = await Promise.all([
              sharedExpensesService.getExpenses(groupId),
              sharedExpensesService.getSettlements(groupId),
            ]);
            if (!cancelled) {
              setExpenseCount(expenses.length);
              setTotalSpent(
                expenses.reduce(
                  (sum, expense) => sum + expense.amount_cents,
                  0,
                ),
              );
              setMyBalance(
                userId
                  ? (computeBalances(expenses, settlements).get(userId)
                      ?.netBalance ?? 0)
                  : 0,
              );
            }
          } catch {}
        };
        load();

        const reload = () => {
          load();
        };

        // Los pagos entre miembros también cambian el saldo
        const subscription = supabase
          .channel(`group-expenses-realtime:${groupId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "shared_expenses",
              filter: `group_id=eq.${groupId}`,
            },
            reload,
          )
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "shared_expense_settlements",
              filter: `group_id=eq.${groupId}`,
            },
            reload,
          )
          .subscribe();

        return () => {
          cancelled = true;
          subscription.unsubscribe();
        };
      }, [groupId, userId]),
    );

    const balanceLabel =
      myBalance > 0 ? "Te deben" : myBalance < 0 ? "Debes" : "Tu saldo";
    const balanceValue =
      myBalance === 0 ? "Al día" : formatCents(Math.abs(myBalance));
    const totalLabel = `${expenseCount} ${plural(expenseCount, "gasto", "gastos")} · ${formatCents(totalSpent)}`;
    const emptyText = widget.widget.subtitle || "Gastos compartidos del viaje";

    return (
      <WidgetShell
        index={index}
        icon="wallet-outline"
        name={widget.widget.name}
        tone="green"
        label={expenseCount > 0 ? balanceLabel : widget.widget.name}
        summary={
          expenseCount > 0
            ? `${balanceLabel}: ${balanceValue}. ${totalLabel} en total`
            : emptyText
        }
        onPress={() => onPress(widget)}
      >
        {expenseCount > 0 ? (
          <>
            <WidgetValue color={palette.strong}>{balanceValue}</WidgetValue>
            <WidgetDetail color={palette.soft}>{totalLabel}</WidgetDetail>
          </>
        ) : (
          <Text
            style={[styles.widgetEmpty, { color: palette.strong }]}
            numberOfLines={2}
          >
            {emptyText}
          </Text>
        )}
      </WidgetShell>
    );
  },
);

GastosWidgetCard.displayName = "GastosWidgetCard";

const PremiosWidgetCard = React.memo<WidgetCardProps>(
  ({ widget, index, onPress, groupId }) => {
    const palette = useWidgetTone("amber");
    const [total, setTotal] = useState(0);
    const [votingAwards, setVotingAwards] = useState<Award[]>([]);

    useFocusEffect(
      React.useCallback(() => {
        let cancelled = false;
        const load = async () => {
          try {
            const [counts, awards] = await Promise.all([
              awardsService.getAwardCounts(groupId),
              awardsService.getGroupAwards(groupId),
            ]);
            if (!cancelled) {
              setTotal(counts.total);
              // Primero la votación que antes termina; las que no tienen fin, al final
              setVotingAwards(
                awards
                  .filter((award) => award.status === "voting")
                  .sort(
                    (a, b) =>
                      (a.voting_end_at
                        ? new Date(a.voting_end_at).getTime()
                        : Infinity) -
                      (b.voting_end_at
                        ? new Date(b.voting_end_at).getTime()
                        : Infinity),
                  ),
              );
            }
          } catch {}
        };
        load();

        const subscription = supabase
          .channel(`group-awards-realtime:${groupId}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "awards",
              filter: `group_id=eq.${groupId}`,
            },
            () => {
              load();
            },
          )
          .subscribe();

        return () => {
          cancelled = true;
          subscription.unsubscribe();
        };
      }, [groupId]),
    );

    const current = votingAwards[0];
    const others = votingAwards.length - 1;
    const timeLeft = current ? formatTimeLeft(current.voting_end_at) : "";
    const totalLabel = plural(total, "premio", "premios");
    const emptyText = widget.widget.subtitle || "Premios del grupo";

    return (
      <WidgetShell
        index={index}
        icon={
          (widget.widget.icon as keyof typeof Ionicons.glyphMap) ||
          "trophy-outline"
        }
        name={widget.widget.name}
        tone="amber"
        label={current ? "En votación" : widget.widget.name}
        labelAccent={!!current}
        summary={
          current
            ? `En votación: ${current.name}. ${timeLeft}`
            : total > 0
              ? `${total} ${totalLabel}`
              : emptyText
        }
        onPress={() => onPress(widget)}
      >
        {current ? (
          <>
            <Text
              style={[styles.widgetTitle, { color: palette.strong }]}
              numberOfLines={2}
            >
              {current.name}
            </Text>
            <WidgetDetail color={palette.soft}>
              {others > 0 ? `${timeLeft} · +${others}` : timeLeft}
            </WidgetDetail>
          </>
        ) : total > 0 ? (
          <>
            <WidgetValue color={palette.strong}>{total}</WidgetValue>
            <WidgetDetail color={palette.soft}>{totalLabel}</WidgetDetail>
          </>
        ) : (
          <Text
            style={[styles.widgetEmpty, { color: palette.strong }]}
            numberOfLines={2}
          >
            {emptyText}
          </Text>
        )}
      </WidgetShell>
    );
  },
);

PremiosWidgetCard.displayName = "PremiosWidgetCard";

// Los estados sin etiqueta propia se muestran con el nombre del widget
const FLASHBACK_LABELS: Partial<Record<FlashbackPartyStatus, string>> = {
  scheduled: "Próxima fiesta",
  active: "En directo",
  film_used: "Carrete agotado",
  revealing: "¡Fotos listas!",
};

const FlashbackWidgetCard = React.memo<WidgetCardProps>(
  ({ widget, index, onPress, groupId }) => {
    const palette = useWidgetTone("purple");
    const [status, setStatus] = useState<FlashbackPartyStatus | null>(null);
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
              setPartyName(preview.partyName);
              setStartsAt(preview.startsAt);
              setPhotoLimit(preview.photoLimit);
              setPhotosTaken(preview.photosTaken);
            }
          } catch {}
        };
        load();
        return () => {
          cancelled = true;
        };
      }, [groupId]),
    );

    const isLive = status === "active";
    const isRevealing = status === "revealing";
    const filmRatio =
      photoLimit > 0 ? Math.min(photosTaken / photoLimit, 1) : 0;

    const getStatusText = (): string => {
      switch (status) {
        case "scheduled": {
          if (startsAt) {
            const date = new Date(startsAt);
            return `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]} · ${formatTime(date)}`;
          }
          return "Empieza pronto...";
        }
        case "active":
          return `${photosTaken} de ${photoLimit} disparos`;
        case "film_used":
          return "Revelando pronto...";
        case "revealing":
          return "Toca para verlas";
        default:
          return "Crear fiesta";
      }
    };

    const statusText = getStatusText();
    const statusLabel = (status && FLASHBACK_LABELS[status]) || "Flashback";
    const hasParty = status !== null && !!partyName;

    return (
      <WidgetShell
        index={index}
        icon="camera-outline"
        name="Flashback"
        tone="purple"
        label={statusLabel}
        labelAccent={isLive || isRevealing}
        summary={
          hasParty ? `${statusLabel}: ${partyName}. ${statusText}` : statusText
        }
        highlighted={isLive}
        iconEmphasized={isLive || isRevealing}
        accessory={
          isLive && (
            <View style={styles.liveBadge}>
              <View
                style={[styles.liveDot, { backgroundColor: palette.accent }]}
              />
              <Text style={[styles.liveText, { color: palette.text }]}>
                LIVE
              </Text>
            </View>
          )
        }
        onPress={() => onPress(widget)}
      >
        {hasParty ? (
          <WidgetValue color={palette.strong}>{partyName}</WidgetValue>
        ) : (
          <Text
            style={[styles.widgetEmpty, { color: palette.strong }]}
            numberOfLines={2}
          >
            {statusText}
          </Text>
        )}

        {isLive && (
          <View style={[styles.widgetBarBg, { backgroundColor: palette.chip }]}>
            <View
              style={[
                styles.widgetBarFill,
                {
                  width: `${Math.max(filmRatio * 100, 2)}%`,
                  backgroundColor: palette.accent,
                },
              ]}
            />
          </View>
        )}

        {hasParty && (
          <WidgetDetail color={palette.soft}>{statusText}</WidgetDetail>
        )}
      </WidgetShell>
    );
  },
);

FlashbackWidgetCard.displayName = "FlashbackWidgetCard";

const WidgetCard = React.memo<WidgetCardProps>((props) => {
  if (props.widget.widget.name === WIDGET_ARCHIVO) {
    return <ArchivoWidgetCard {...props} />;
  }
  if (props.widget.widget.name === WIDGET_AGENDA) {
    return <AgendaWidgetCard {...props} />;
  }
  if (props.widget.widget.name === WIDGET_BLOC) {
    return <BlocWidgetCard {...props} />;
  }
  if (props.widget.widget.name === WIDGET_PLANES) {
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

const WidgetSkeletonSquare = React.memo<{ index: number }>(({ index }) => {
  const theme = useTheme();
  const blockMid = theme.dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const blockSoft = theme.dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";

  return (
    <Animated.View
      entering={FadeIn.duration(400).delay(280 + index * 80)}
      style={styles.bentoItem}
    >
      <SquircleView
        style={[
          styles.widgetCard,
          {
            backgroundColor: theme.colors.surfaceVariant,
            borderColor: theme.colors.outlineVariant,
            borderWidth: 1,
          },
        ]}
        cornerSmoothing={1}
      >
        <View />
        <View style={styles.widgetBody}>
          <View
            style={{
              width: "45%",
              height: 11,
              borderRadius: 6,
              backgroundColor: blockSoft,
            }}
          />
          <View
            style={{
              width: "62%",
              height: 20,
              borderRadius: 8,
              marginTop: 7,
              backgroundColor: blockMid,
            }}
          />
          <View
            style={{
              width: "50%",
              height: 10,
              borderRadius: 5,
              marginTop: 7,
              backgroundColor: blockSoft,
            }}
          />
        </View>
      </SquircleView>
    </Animated.View>
  );
});

WidgetSkeletonSquare.displayName = "WidgetSkeletonSquare";

const WidgetSkeletonWide = React.memo(() => {
  const theme = useTheme();
  const blockLight = theme.dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const blockMid = theme.dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const blockSoft = theme.dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";

  return (
    <Animated.View
      entering={FadeIn.duration(400).delay(240)}
      style={styles.bentoItemWide}
    >
      <SquircleView
        style={[
          styles.archivoCard,
          {
            backgroundColor: theme.colors.surfaceVariant,
            borderColor: theme.colors.outlineVariant,
            borderWidth: 1,
          },
        ]}
        cornerSmoothing={1}
      >
        <View style={styles.archivoContent}>
          <View style={styles.archivoTopRow}>
            <View style={styles.archivoStorageBlock}>
              <View
                style={{
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: blockSoft,
                }}
              />
              <View
                style={{
                  width: "55%",
                  height: 10,
                  borderRadius: 5,
                  marginTop: 4,
                  backgroundColor: blockSoft,
                }}
              />
            </View>
          </View>
          <View>
            <View
              style={{
                width: "22%",
                height: 11,
                borderRadius: 6,
                backgroundColor: blockLight,
              }}
            />
            <View
              style={{
                width: "38%",
                height: 20,
                borderRadius: 8,
                marginTop: 7,
                backgroundColor: blockMid,
              }}
            />
          </View>
        </View>
      </SquircleView>
    </Animated.View>
  );
});

WidgetSkeletonWide.displayName = "WidgetSkeletonWide";

interface FloatingTopBarProps {
  onBack: () => void;
  right?: React.ReactNode;
}

// Barra superior flotante: el contenido pasa por debajo y se funde con el fondo al llegar arriba
function FloatingTopBar({ onBack, right }: FloatingTopBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.topBar} pointerEvents="box-none">
      <View
        style={{ height: insets.top + TOP_BAR_HEIGHT + 20 }}
        pointerEvents="none"
      >
        <Svg width="100%" height="100%">
          <Defs>
            <LinearGradient id="groupTopFade" x1="0" y1="0" x2="0" y2="1">
              <Stop
                offset="0"
                stopColor={theme.colors.background}
                stopOpacity="1"
              />
              <Stop
                offset="0.55"
                stopColor={theme.colors.background}
                stopOpacity="0.85"
              />
              <Stop
                offset="1"
                stopColor={theme.colors.background}
                stopOpacity="0"
              />
            </LinearGradient>
          </Defs>
          <Rect width="100%" height="100%" fill="url(#groupTopFade)" />
        </Svg>
      </View>

      <View
        style={[styles.topBarRow, { top: insets.top + 8 }]}
        pointerEvents="box-none"
      >
        <CircleButton icon="chevron-back" label="Atrás" onPress={onBack} />
        {right}
      </View>
    </View>
  );
}

interface InviteButtonProps {
  onPress: () => void;
}

function InviteButton({ onPress }: InviteButtonProps) {
  const theme = useTheme();

  const content = (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Invitar al grupo"
      hitSlop={6}
      style={styles.inviteButtonContent}
    >
      <Ionicons name="person-add" size={15} color={theme.colors.onPrimary} />
      <Text
        style={[styles.inviteButtonText, { color: theme.colors.onPrimary }]}
      >
        Invitar
      </Text>
    </Pressable>
  );

  if (glassAvailable) {
    return (
      <GlassView
        style={styles.inviteButton}
        tintColor={theme.colors.primary}
        isInteractive
      >
        {content}
      </GlassView>
    );
  }

  return (
    <View
      style={[styles.inviteButton, { backgroundColor: theme.colors.primary }]}
    >
      {content}
    </View>
  );
}

interface ExploreWidgetsButtonProps {
  onPress: () => void;
}

// Acción de la pantalla, no un widget: cápsula centrada bajo la cuadrícula
function ExploreWidgetsButton({ onPress }: ExploreWidgetsButtonProps) {
  const theme = useTheme();

  const content = (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      hitSlop={6}
      style={styles.exploreButtonContent}
    >
      <Ionicons name="add" size={18} color={theme.colors.onSurface} />
      <Text
        style={[styles.exploreButtonText, { color: theme.colors.onSurface }]}
      >
        Explorar widgets
      </Text>
    </Pressable>
  );

  if (glassAvailable) {
    return (
      <GlassView style={styles.exploreButton} isInteractive>
        {content}
      </GlassView>
    );
  }

  return (
    <View
      style={[
        styles.exploreButton,
        {
          backgroundColor: theme.dark
            ? "rgba(255,255,255,0.1)"
            : "rgba(0,0,0,0.06)",
        },
      ]}
    >
      {content}
    </View>
  );
}

const GroupDetailSkeleton = React.memo(() => {
  const theme = useTheme();
  const blockLight = theme.dark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)";
  const blockMid = theme.dark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)";
  const blockSoft = theme.dark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)";

  return (
    <>
      <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
        <View
          style={[
            styles.hero,
            styles.heroCover,
            { backgroundColor: blockLight, borderWidth: 0 },
          ]}
        />
        <View
          style={{
            width: "68%",
            height: 34,
            borderRadius: 10,
            backgroundColor: blockMid,
          }}
        />
        <View
          style={[
            styles.headerDivider,
            { backgroundColor: theme.colors.outlineVariant },
          ]}
        />
        <View
          style={{
            width: "92%",
            height: 14,
            borderRadius: 7,
            backgroundColor: blockLight,
          }}
        />
        <View
          style={{
            width: "64%",
            height: 14,
            borderRadius: 7,
            marginTop: 8,
            backgroundColor: blockSoft,
          }}
        />
      </Animated.View>

      <Animated.View
        entering={FadeIn.duration(400).delay(80)}
        style={styles.membersRow}
      >
        <View style={styles.membersInfo}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                  borderWidth: 2,
                  borderColor: theme.colors.background,
                  backgroundColor: blockLight,
                  marginLeft: i > 0 ? -10 : 0,
                  zIndex: 5 - i,
                }}
              />
            ))}
          </View>
          <View
            style={{
              width: 90,
              height: 14,
              borderRadius: 7,
              backgroundColor: blockMid,
            }}
          />
        </View>
        <View style={[styles.inviteButton, { backgroundColor: blockSoft }]} />
      </Animated.View>

      <Animated.View
        entering={FadeIn.duration(400).delay(120)}
        style={[
          styles.sectionDivider,
          { backgroundColor: theme.colors.outlineVariant },
        ]}
      />

      <View style={styles.bentoGrid}>
        <WidgetSkeletonWide />
        <WidgetSkeletonSquare index={0} />
        <WidgetSkeletonSquare index={1} />
        <WidgetSkeletonSquare index={2} />
        <WidgetSkeletonSquare index={3} />
      </View>
    </>
  );
});

GroupDetailSkeleton.displayName = "GroupDetailSkeleton";

export default function GroupDetailScreen() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  // En iOS la barra nativa ya forma parte del área segura inferior.
  const tabBarPadding =
    Platform.OS === "ios" ? insets.bottom + 16 : 120 + insets.bottom;
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
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
    onConfirm: () => {},
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

  const { group, isLoading, error, refetch, isAdmin } = useGroup(id);

  const canManageWidgets =
    isAdmin || (group?.settings?.allow_member_manage_widgets ?? false);

  const [widgets, setWidgets] = useState<GroupWidgetWithDetails[]>([]);

  const fetchWidgets = useCallback(async () => {
    if (!id) return;
    try {
      const data = await widgetsService.getGroupWidgets(id as string);
      setWidgets(data);
    } catch {}
  }, [id]);

  useFocusEffect(
    React.useCallback(() => {
      refetch();
      fetchWidgets();
    }, [refetch, fetchWidgets]),
  );

  const handleWidgetPress = useCallback(
    (widget: GroupWidgetWithDetails) => {
      if (widget.widget.name === "Archivo") {
        router.push({
          pathname: "/groups/group/gallery",
          params: { id },
        } as any);
        return;
      }
      if (widget.widget.name === WIDGET_BLOC) {
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
      if (widget.widget.name === WIDGET_PLANES) {
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
    },
    [router, id, showSnackbar],
  );

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

  const handleInvitePress = useCallback(() => {
    if (!group) return;
    setShowInviteModal(true);
  }, [group]);

  // Deja sitio a la barra flotante, que va por encima del contenido
  const contentTop = insets.top + TOP_BAR_HEIGHT;

  if (isLoading && !group) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <View
          style={[
            styles.container,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.content,
              { paddingTop: contentTop, paddingBottom: tabBarPadding },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <GroupDetailSkeleton />
          </ScrollView>
          <FloatingTopBar onBack={() => router.back()} />
        </View>
      </>
    );
  }

  if (error || !group) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <StatusView
          icon="warning-outline"
          color={theme.colors.onSurfaceVariant}
          title={error ? "Error al cargar" : "Grupo no encontrado"}
          message={
            error
              ? "No se pudo cargar el grupo. Inténtalo de nuevo."
              : "Este grupo ya no existe o no tienes acceso."
          }
          onClose={() => router.back()}
        >
          <CTAButton
            title="Volver"
            iconName="arrow-back"
            onPress={() => router.back()}
          />
        </StatusView>
      </>
    );
  }

  // Los anchos van primero, para que ningún cuadrado se quede solo en mitad de la cuadrícula
  const orderedWidgets = [
    ...widgets.filter((widget) => WIDE_WIDGETS.has(widget.widget.name)),
    ...widgets.filter((widget) => !WIDE_WIDGETS.has(widget.widget.name)),
  ];

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <BlurTargetView ref={backgroundRef} style={styles.container}>
        <View
          style={[
            styles.container,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.content,
              { paddingTop: contentTop, paddingBottom: tabBarPadding },
            ]}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              entering={FadeIn.duration(500)}
              style={styles.header}
            >
              <SquircleView
                style={[
                  styles.hero,
                  { borderColor: theme.colors.outlineVariant },
                ]}
                cornerSmoothing={1}
              >
                <GroupCover
                  uri={group.cover_image_url}
                  name={group.name}
                  style={styles.heroCover}
                />
              </SquircleView>

              <Text
                accessibilityRole="header"
                style={[styles.groupName, { color: theme.colors.primary }]}
                numberOfLines={2}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {group.name}
              </Text>

              <View
                style={[
                  styles.headerDivider,
                  { backgroundColor: theme.colors.outlineVariant },
                ]}
              />

              <Text
                style={[
                  styles.groupDescription,
                  { color: theme.colors.onSurfaceVariant },
                ]}
                numberOfLines={2}
              >
                {group.description ||
                  "Tu espacio privado para organizaros juntos."}
              </Text>
            </Animated.View>

            <Animated.View
              entering={FadeIn.duration(400).delay(100)}
              style={styles.membersRow}
            >
              <Pressable
                onPress={() => setShowMembersBottomSheet(true)}
                accessibilityRole="button"
                accessibilityLabel={`${group.member_count} ${
                  group.member_count === 1 ? "miembro" : "miembros"
                }. Ver la lista`}
                style={({ pressed }) => [
                  styles.membersInfo,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <MemberAvatarsRow users={group.members} max={5} size="sm" />
                <Text
                  style={[
                    styles.membersCount,
                    { color: theme.colors.onSurface },
                  ]}
                  numberOfLines={1}
                >
                  {group.member_count}{" "}
                  {group.member_count === 1 ? "miembro" : "miembros"}
                </Text>
              </Pressable>

              <InviteButton onPress={handleInvitePress} />
            </Animated.View>

            <Animated.View
              entering={FadeIn.duration(400).delay(150)}
              style={[
                styles.sectionDivider,
                { backgroundColor: theme.colors.outlineVariant },
              ]}
            />

            {widgets.length > 0 ? (
              <View style={styles.bentoGrid}>
                {orderedWidgets.map((widget, index) => (
                  <WidgetCard
                    key={widget.id}
                    widget={widget}
                    index={index}
                    onPress={handleWidgetPress}
                    groupId={id as string}
                  />
                ))}

                {canManageWidgets && (
                  <Animated.View
                    entering={FadeIn.duration(400).delay(
                      200 + widgets.length * 80,
                    )}
                    style={styles.exploreRow}
                  >
                    <ExploreWidgetsButton onPress={handleAddWidget} />
                  </Animated.View>
                )}
              </View>
            ) : (
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
                      { backgroundColor: `${theme.colors.primary}1F` },
                    ]}
                    cornerSmoothing={1}
                  >
                    <Ionicons
                      name="grid-outline"
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

          <FloatingTopBar
            onBack={() => router.back()}
            right={
              isAdmin && (
                <CircleButton
                  icon="settings-outline"
                  label="Ajustes del grupo"
                  onPress={() =>
                    router.push({
                      pathname: "/groups/group/settings",
                      params: { id },
                    })
                  }
                />
              )
            }
          />

          <InviteModal
            visible={showInviteModal}
            onClose={() => setShowInviteModal(false)}
            inviteCode={group.invite_code}
            groupName={group.name}
          />

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

  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  topBarRow: {
    position: "absolute",
    left: 16,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
  },

  header: {
    marginBottom: 18,
  },
  hero: {
    borderRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginBottom: 16,
  },
  heroCover: {
    height: 180,
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

  membersRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 18,
  },
  membersInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  membersCount: {
    flexShrink: 1,
    fontFamily: "Archivo-Bold",
    fontSize: 14,
  },
  inviteButton: {
    height: 38,
    minWidth: 100,
    borderRadius: 19,
  },
  inviteButtonContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 16,
  },
  inviteButtonText: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 14,
  },

  sectionDivider: {
    height: 1,
    marginBottom: 20,
  },

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

  archivoCard: {
    borderRadius: 24,
    height: 156,
    overflow: "hidden",
    flexDirection: "row",
    gap: 3,
  },
  archivoMain: {
    flex: 2,
  },
  archivoSide: {
    flex: 1,
    gap: 3,
  },
  archivoSidePhoto: {
    flex: 1,
  },
  archivoScrim: {
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  archivoContent: {
    flex: 1,
    padding: 16,
    justifyContent: "space-between",
    zIndex: 1,
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
    fontSize: 11,
    letterSpacing: 0.3,
  },

  widgetCard: {
    borderRadius: 24,
    padding: 16,
    aspectRatio: 1,
    justifyContent: "space-between",
    overflow: "hidden",
  },
  widgetCardWide: {
    borderRadius: 24,
    padding: 16,
    gap: 14,
    overflow: "hidden",
  },
  widgetHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 18,
  },
  widgetTitle: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 15,
    lineHeight: 19,
  },

  agendaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  agendaDateBlock: {
    alignItems: "center",
    minWidth: 52,
  },
  agendaMonth: {
    fontFamily: "Archivo-Bold",
    fontSize: 12,
    letterSpacing: 1,
  },
  agendaDay: {
    fontFamily: "Archivo-Bold",
    fontSize: 36,
    lineHeight: 40,
  },
  agendaEvents: {
    flex: 1,
    gap: 8,
  },
  agendaEventTitle: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 15,
    lineHeight: 19,
  },
  widgetBody: {
    gap: 1,
  },
  widgetName: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 13,
    letterSpacing: 0.2,
  },
  widgetValue: {
    fontFamily: "Archivo-Bold",
    fontSize: 22,
    lineHeight: 27,
  },
  widgetDetail: {
    fontFamily: "Archivo-Medium",
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 0.2,
  },
  widgetEmpty: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 15,
    lineHeight: 20,
    marginTop: 2,
  },
  widgetBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
  },
  widgetBadgeText: {
    fontFamily: "Archivo-Bold",
    fontSize: 11,
    letterSpacing: 0.2,
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  liveText: {
    fontFamily: "Archivo-Bold",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  widgetBarBg: {
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
    marginVertical: 4,
  },
  widgetBarFill: {
    height: "100%",
    borderRadius: 3,
  },

  exploreRow: {
    width: "100%",
    alignItems: "center",
    marginTop: 6,
  },
  exploreButton: {
    height: 46,
    borderRadius: 23,
  },
  exploreButtonContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 22,
  },
  exploreButtonText: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 15,
  },

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
