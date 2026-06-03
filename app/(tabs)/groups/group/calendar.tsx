import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { BlurTargetView } from "expo-blur";
import { Image } from "expo-image";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
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
  Layout,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CustomHeader } from "@/components/ui/CustomHeader";
import { useSnackbar } from "@/components/ui/SnackbarContext";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useAuth, useGroup } from "@/hooks";
import {
  buildCalendarMonthLayout,
  CalendarWeekBar,
  CALENDAR_EVENT_MARKER_GAP,
  CALENDAR_EVENT_MARKER_SIZE,
  getMondayBasedOffset,
} from "@/lib/calendarMonthLayout";
import { getEventScheduleCompact } from "@/lib/eventSchedule";
import { supabase } from "@/lib/supabase";
import { eventsService } from "@/services/events.service";
import {
  CalendarEventWithDetails,
  GalleryImageWithUser,
} from "@/types/database";

// ─── Constants ──────────────────────────────────────────────────────────
const DAYS_ES = ["L", "M", "X", "J", "V", "S", "D"];
const MONTHS_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

const RSVP_ICONS: Record<string, { icon: string; color: string }> = {
  accepted: { icon: "checkmark-circle", color: "#10B981" },
  pending: { icon: "time-outline", color: "#F59E0B" },
  declined: { icon: "close-circle", color: "#EF4444" },
  maybe: { icon: "help-circle", color: "#6366F1" },
};

// ─── Continuous multi-day bar overlayed on a week row ──────────────────
const MARKER_STEP = CALENDAR_EVENT_MARKER_SIZE + CALENDAR_EVENT_MARKER_GAP;
const BASE_ROW_HEIGHT = 46;

const WeekEventBar = React.memo<{ bar: CalendarWeekBar }>(({ bar }) => {
  const leftFrac = bar.roundLeft
    ? (bar.startCol + 0.5) / 7
    : bar.startCol / 7;
  const rightFrac = bar.roundRight
    ? (bar.endCol + 0.5) / 7
    : (bar.endCol + 1) / 7;
  const widthFrac = Math.max(0, rightFrac - leftFrac);
  const bottom = 2 + bar.lane * MARKER_STEP;
  const radius = CALENDAR_EVENT_MARKER_SIZE / 2;

  return (
    <View
      style={{
        position: "absolute",
        left: `${leftFrac * 100}%`,
        width: `${widthFrac * 100}%`,
        bottom,
        height: CALENDAR_EVENT_MARKER_SIZE,
        backgroundColor: bar.color,
        borderTopLeftRadius: bar.roundLeft ? radius : 0,
        borderBottomLeftRadius: bar.roundLeft ? radius : 0,
        borderTopRightRadius: bar.roundRight ? radius : 0,
        borderBottomRightRadius: bar.roundRight ? radius : 0,
      }}
    />
  );
});
WeekEventBar.displayName = "WeekEventBar";

// ─── Calendar Grid ──────────────────────────────────────────────────────
interface CalendarGridProps {
  year: number;
  month: number; // 0-indexed
  selectedDate: Date;
  singleDayDots: Map<number, string[]>;
  weekBarsByRow: Map<number, CalendarWeekBar[]>;
  maxLanesByRow: Map<number, number>;
  onSelectDate: (date: Date) => void;
  todayDate: Date;
}

const CalendarGrid = React.memo<CalendarGridProps>(
  ({
    year,
    month,
    selectedDate,
    singleDayDots,
    weekBarsByRow,
    maxLanesByRow,
    onSelectDate,
    todayDate,
  }) => {
    const theme = useTheme();

    const { days, startOffset } = useMemo(() => {
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      return {
        days: daysInMonth,
        startOffset: getMondayBasedOffset(year, month),
      };
    }, [year, month]);

    const isToday = useCallback(
      (day: number) =>
        todayDate.getFullYear() === year &&
        todayDate.getMonth() === month &&
        todayDate.getDate() === day,
      [todayDate, year, month],
    );

    const isSelected = useCallback(
      (day: number) =>
        selectedDate.getFullYear() === year &&
        selectedDate.getMonth() === month &&
        selectedDate.getDate() === day,
      [selectedDate, year, month],
    );

    const cells = useMemo(() => {
      const result: (number | null)[] = [];
      for (let i = 0; i < startOffset; i++) result.push(null);
      for (let d = 1; d <= days; d++) result.push(d);
      return result;
    }, [days, startOffset]);

    return (
      <View style={styles.calendarGrid}>
        {/* Day headers */}
        <View style={styles.dayHeaderRow}>
          {DAYS_ES.map((d) => (
            <View key={d} style={styles.dayHeaderCell}>
              <Text
                style={[
                  styles.dayHeaderText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {d}
              </Text>
            </View>
          ))}
        </View>

        {/* Day cells — render row by row */}
        {Array.from({ length: Math.ceil(cells.length / 7) }).map(
          (_, rowIdx) => {
            const rowCells = cells.slice(rowIdx * 7, rowIdx * 7 + 7);
            while (rowCells.length < 7) {
              rowCells.push(null);
            }

            const rowBars = weekBarsByRow.get(rowIdx) || [];
            const laneCount = maxLanesByRow.get(rowIdx) || 0;
            const rowHasDots = rowCells.some(
              (d) => d !== null && (singleDayDots.get(d) || []).length > 0,
            );
            const markerRows = laneCount + (rowHasDots ? 1 : 0);
            const extraHeight = Math.max(0, markerRows - 1) * MARKER_STEP;
            const rowHeight = BASE_ROW_HEIGHT + extraHeight;
            const dotBottom = 2 + laneCount * MARKER_STEP;

            return (
              <View
                key={rowIdx}
                style={[styles.dayRow, { height: rowHeight }]}
              >
                {rowCells.map((day, colIdx) => {
                  if (day === null) {
                    return (
                      <View
                        key={`e-${colIdx}-${rowIdx}`}
                        style={styles.dayCell}
                      />
                    );
                  }

                  const selected = isSelected(day);
                  const today = isToday(day);
                  const colors = singleDayDots.get(day) || [];

                  return (
                    <TouchableOpacity
                      key={day}
                      style={styles.dayCell}
                      onPress={() => onSelectDate(new Date(year, month, day))}
                      activeOpacity={0.7}
                    >
                      <View style={styles.dayCircleContainer}>
                        <View
                          style={[
                            styles.dayBackground,
                            {
                              backgroundColor: selected
                                ? theme.colors.primary
                                : "transparent",
                              borderColor:
                                today && !selected
                                  ? theme.colors.primary
                                  : "transparent",
                              borderWidth: today && !selected ? 1.5 : 0,
                            },
                          ]}
                        />
                        <Text
                          style={[
                            styles.dayText,
                            {
                              color: selected
                                ? "#FFFFFF"
                                : today
                                  ? theme.colors.primary
                                  : theme.colors.onSurface,
                            },
                          ]}
                        >
                          {day}
                        </Text>
                      </View>

                      {colors.length > 0 && (
                        <View
                          style={[
                            styles.dotRowAbsolute,
                            { bottom: dotBottom },
                          ]}
                        >
                          {colors.slice(0, 3).map((c, i) => (
                            <View
                              key={i}
                              style={[
                                styles.eventDot,
                                { backgroundColor: c },
                              ]}
                            />
                          ))}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}

                {rowBars.length > 0 && (
                  <View
                    style={StyleSheet.absoluteFill}
                    pointerEvents="none"
                  >
                    {rowBars.map((bar) => (
                      <WeekEventBar
                        key={`${bar.eventId}-${bar.lane}-${bar.startCol}`}
                        bar={bar}
                      />
                    ))}
                  </View>
                )}
              </View>
            );
          },
        )}
      </View>
    );
  },
);

CalendarGrid.displayName = "CalendarGrid";

// ─── Event Card ─────────────────────────────────────────────────────────
interface EventCardProps {
  event: CalendarEventWithDetails;
  index: number;
  onPress: () => void;
}

const EventCard = React.memo<EventCardProps>(({ event, index, onPress }) => {
  const theme = useTheme();

  const timeLabel = useMemo(
    () => getEventScheduleCompact(event),
    [event],
  );

  const acceptedCount = useMemo(
    () => event.participants.filter((p) => p.status === "accepted").length,
    [event.participants],
  );

  return (
    <Animated.View
      entering={FadeInDown.duration(300).delay(80 + index * 60)}
      layout={Layout.springify()}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          {
            opacity: pressed ? 0.92 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
      >
        <SquircleView
          style={[
            styles.eventCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.outlineVariant,
              borderWidth: 1,
            },
          ]}
          cornerSmoothing={1}
        >
          {/* Color accent bar */}
          <View
            style={[styles.eventColorBar, { backgroundColor: event.color }]}
          />

          <View style={styles.eventCardBody}>
            {/* Top row: icon + title + time */}
            <View style={styles.eventTopRow}>
              <Ionicons name="calendar" size={24} color={event.color} />
              <View style={styles.eventTitleBlock}>
                <Text
                  style={[styles.eventTitle, { color: theme.colors.onSurface }]}
                  numberOfLines={1}
                >
                  {event.title}
                </Text>
                <Text
                  style={[
                    styles.eventTime,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {timeLabel}
                </Text>
              </View>
            </View>

            {/* Bottom row: participants + location + photos */}
            <View style={styles.eventBottomRow}>
              {/* Participants */}
              {event.participants.length > 0 && (
                <View style={styles.eventChip}>
                  <View style={styles.miniAvatarRow}>
                    {event.participants.slice(0, 3).map((p, i) => (
                      <View
                        key={p.id}
                        style={[
                          styles.miniAvatarWrapper,
                          { marginLeft: i > 0 ? -6 : 0 },
                        ]}
                      >
                        <UserAvatar
                          uri={p.user?.avatar_url}
                          name={p.user?.display_name || "?"}
                          size={18}
                          borderRadius={6}
                        />
                      </View>
                    ))}
                  </View>
                  <Text
                    style={[
                      styles.eventChipText,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {acceptedCount}/{event.participants.length}
                  </Text>
                </View>
              )}

              {/* Location */}
              {event.location && (
                <View style={styles.eventChip}>
                  <Ionicons
                    name="location-outline"
                    size={12}
                    color={theme.colors.onSurfaceVariant}
                  />
                  <Text
                    style={[
                      styles.eventChipText,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                    numberOfLines={1}
                  >
                    {event.location}
                  </Text>
                </View>
              )}

              {/* Photos */}
              {event.gallery_count > 0 && (
                <View style={styles.eventChip}>
                  <Ionicons
                    name="camera-outline"
                    size={12}
                    color={theme.colors.onSurfaceVariant}
                  />
                  <Text
                    style={[
                      styles.eventChipText,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {event.gallery_count}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </SquircleView>
      </Pressable>
    </Animated.View>
  );
});

EventCard.displayName = "EventCard";

// ─── Day Photos Row ─────────────────────────────────────────────────────
interface DayPhotosRowProps {
  photos: GalleryImageWithUser[];
}

const DayPhotosRow = React.memo<DayPhotosRowProps>(({ photos }) => {
  const theme = useTheme();
  if (photos.length === 0) return null;

  return (
    <Animated.View
      entering={FadeInDown.duration(300).delay(200)}
      style={styles.photosSection}
    >
      <View style={styles.photosSectionHeader}>
        <Ionicons
          name="camera-outline"
          size={16}
          color={theme.colors.onSurfaceVariant}
        />
        <Text
          style={[
            styles.photosSectionTitle,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          Fotos de este día ({photos.length})
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.photosScroll}
      >
        {photos.map((photo) => (
          <SquircleView
            key={photo.id}
            style={styles.photoThumb}
            cornerSmoothing={1}
          >
            <Image
              source={{ uri: photo.media_url }}
              style={styles.photoThumbImage}
              contentFit="cover"
              transition={200}
            />
          </SquircleView>
        ))}
      </ScrollView>
    </Animated.View>
  );
});

DayPhotosRow.displayName = "DayPhotosRow";

// ─── Skeleton ───────────────────────────────────────────────────────────
const CalendarSkeleton = React.memo(() => {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeIn.duration(400)} style={styles.skeletonWrap}>
      {/* Grid skeleton */}
      <SquircleView
        style={[
          styles.skeletonGrid,
          {
            backgroundColor: theme.colors.surfaceVariant,
            borderColor: theme.colors.outlineVariant,
            borderWidth: 1,
          },
        ]}
        cornerSmoothing={1}
      />
      {/* Event skeletons */}
      {[0, 1].map((i) => (
        <SquircleView
          key={i}
          style={[
            styles.skeletonEvent,
            {
              backgroundColor: theme.colors.surfaceVariant,
              borderColor: theme.colors.outlineVariant,
              borderWidth: 1,
            },
          ]}
          cornerSmoothing={1}
        />
      ))}
    </Animated.View>
  );
});

CalendarSkeleton.displayName = "CalendarSkeleton";

// ─── Main Screen ────────────────────────────────────────────────────────
export default function CalendarScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const { user } = useAuth();
  const { group, isAdmin } = useGroup(id);

  const canCreateEvents =
    isAdmin || (group?.settings?.allow_member_create_events ?? true);

  const today = useMemo(() => new Date(), []);
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(today);
  const [events, setEvents] = useState<CalendarEventWithDetails[]>([]);
  const [dayEvents, setDayEvents] = useState<CalendarEventWithDetails[]>([]);
  const [dayPhotos, setDayPhotos] = useState<GalleryImageWithUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDayEvents, setIsLoadingDayEvents] = useState(false);
  const [isLoadingDay, setIsLoadingDay] = useState(false);

  const isFirstLoad = useRef(true);

  // ─── Fetch events for current month ────────────────────────
  const fetchMonthEvents = useCallback(async () => {
    if (!id) return;
    try {
      if (isFirstLoad.current) {
        setIsLoading(true);
      }
      const data = await eventsService.getGroupEvents(
        id,
        currentYear,
        currentMonth,
      );
      setEvents(data);
    } catch (error) {
      console.error("Error loading calendar events:", error);
      showSnackbar("Error al cargar los eventos", "error");
    } finally {
      setIsLoading(false);
      isFirstLoad.current = false;
    }
  }, [id, currentYear, currentMonth, showSnackbar]);

  useEffect(() => {
    fetchMonthEvents();
  }, [fetchMonthEvents]);

  // ─── Fetch events for selected day (bottom list) ───────────
  const fetchDayEvents = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoadingDayEvents(true);
      const data = await eventsService.getEventsForDate(id, selectedDate);
      setDayEvents(data);
    } catch (error) {
      console.error("Error loading day events:", error);
      showSnackbar("Error al cargar los eventos del día", "error");
    } finally {
      setIsLoadingDayEvents(false);
    }
  }, [id, selectedDate, showSnackbar]);

  useEffect(() => {
    fetchDayEvents();
  }, [fetchDayEvents]);

  // ─── Fetch photos for selected day ─────────────────────────
  const fetchDayPhotos = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoadingDay(true);
      setDayPhotos([]); // Clear old photos to avoid flashes of previous selection
      const photos = await eventsService.getGalleryImagesForDate(
        id,
        selectedDate,
      );
      setDayPhotos(photos);
    } catch (error) {
      console.error("Error loading day photos:", error);
    } finally {
      setIsLoadingDay(false);
    }
  }, [id, selectedDate]);

  useEffect(() => {
    fetchDayPhotos();
  }, [fetchDayPhotos]);

  useFocusEffect(
    useCallback(() => {
      fetchMonthEvents();
      fetchDayEvents();
      fetchDayPhotos();

      const subscription = supabase
        .channel(`calendar-events-realtime:${id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "events",
            filter: `group_id=eq.${id}`,
          },
          () => {
            fetchMonthEvents();
            fetchDayEvents();
          },
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }, [id, fetchMonthEvents, fetchDayEvents, fetchDayPhotos]),
  );

  const handleSelectDate = useCallback((date: Date) => {
    setDayEvents([]);
    setSelectedDate(date);
  }, []);

  const calendarLayout = useMemo(
    () => buildCalendarMonthLayout(events, currentYear, currentMonth),
    [events, currentYear, currentMonth],
  );

  // ─── Navigation ────────────────────────────────────────────
  const goToPreviousMonth = useCallback(() => {
    setEvents([]);
    setDayEvents([]);
    let newMonth = currentMonth - 1;
    let newYear = currentYear;
    if (newMonth < 0) {
      newMonth = 11;
      newYear = currentYear - 1;
    }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);

    // Keep same day number but bound to the target month's total days
    const currentDay = selectedDate.getDate();
    const daysInNewMonth = new Date(newYear, newMonth + 1, 0).getDate();
    const targetDay = Math.min(currentDay, daysInNewMonth);
    setSelectedDate(new Date(newYear, newMonth, targetDay));
  }, [currentMonth, currentYear, selectedDate]);

  const goToNextMonth = useCallback(() => {
    setEvents([]);
    setDayEvents([]);
    let newMonth = currentMonth + 1;
    let newYear = currentYear;
    if (newMonth > 11) {
      newMonth = 0;
      newYear = currentYear + 1;
    }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);

    // Keep same day number but bound to the target month's total days
    const currentDay = selectedDate.getDate();
    const daysInNewMonth = new Date(newYear, newMonth + 1, 0).getDate();
    const targetDay = Math.min(currentDay, daysInNewMonth);
    setSelectedDate(new Date(newYear, newMonth, targetDay));
  }, [currentMonth, currentYear, selectedDate]);

  const goToToday = useCallback(() => {
    const isDifferent =
      currentYear !== today.getFullYear() || currentMonth !== today.getMonth();
    if (isDifferent) {
      setEvents([]);
      setDayEvents([]);
      setCurrentYear(today.getFullYear());
      setCurrentMonth(today.getMonth());
    }
    setSelectedDate(today);
  }, [today, currentYear, currentMonth]);

  const handleCreateEvent = useCallback(() => {
    if (!canCreateEvents) {
      showSnackbar(
        "Solo los administradores pueden crear eventos en este grupo",
        "info"
      );
      return;
    }
    router.push({
      pathname: "/groups/group/createEvent",
      params: { id, date: selectedDate.toISOString() },
    } as never);
  }, [router, id, selectedDate, canCreateEvents, showSnackbar]);

  const handleEventPress = useCallback(
    (event: CalendarEventWithDetails) => {
      router.push({
        pathname: "/groups/group/eventDetail",
        params: { id, eventId: event.id },
      } as never);
    },
    [router, id],
  );

  // ─── Selected day label ────────────────────────────────────
  const selectedDayLabel = useMemo(() => {
    const daysOfWeek = [
      "Domingo",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ];
    return `${daysOfWeek[selectedDate.getDay()]} ${selectedDate.getDate()}`;
  }, [selectedDate]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <BlurTargetView
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <CustomHeader
          title=""
          showBackButton={true}
          rightAction={
            canCreateEvents ? (
              <TouchableOpacity onPress={handleCreateEvent} activeOpacity={0.7}>
                <SquircleView
                  style={[
                    styles.addButton,
                    {
                      backgroundColor: theme.colors.primaryContainer,
                      borderColor: theme.colors.primary,
                      borderWidth: 1,
                    },
                  ]}
                  cornerSmoothing={1}
                >
                  <Ionicons
                    name="add"
                    size={20}
                    color={theme.colors.onSurfaceVariant}
                  />
                </SquircleView>
              </TouchableOpacity>
            ) : undefined
          }
        />

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: 120 + insets.bottom },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Title ─── */}
          <Animated.View
            entering={FadeInUp.duration(500)}
            style={styles.titleBlock}
          >
            <Text style={[styles.screenTitle, { color: theme.colors.primary }]}>
              Agenda
            </Text>
            <Text
              style={[
                styles.screenSubtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Eventos y calendario del grupo
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

          {isLoading ? (
            <CalendarSkeleton />
          ) : (
            <>
              {/* ─── Month Navigator ─── */}
              <Animated.View
                entering={FadeInDown.duration(400).delay(80)}
                style={styles.monthNavigator}
              >
                <TouchableOpacity
                  onPress={goToPreviousMonth}
                  hitSlop={12}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="chevron-back"
                    size={24}
                    color={theme.colors.onSurface}
                  />
                </TouchableOpacity>

                <TouchableOpacity onPress={goToToday} activeOpacity={0.7}>
                  <Text
                    style={[
                      styles.monthLabel,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    {MONTHS_ES[currentMonth]} {currentYear}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={goToNextMonth}
                  hitSlop={12}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="chevron-forward"
                    size={24}
                    color={theme.colors.onSurface}
                  />
                </TouchableOpacity>
              </Animated.View>

              {/* ─── Calendar Grid ─── */}
              <Animated.View entering={FadeInDown.duration(400).delay(120)}>
                <SquircleView
                  style={[
                    styles.calendarContainer,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.outlineVariant,
                      borderWidth: 1,
                    },
                  ]}
                  cornerSmoothing={1}
                >
                  <CalendarGrid
                    year={currentYear}
                    month={currentMonth}
                    selectedDate={selectedDate}
                    singleDayDots={calendarLayout.singleDayDots}
                    weekBarsByRow={calendarLayout.weekBarsByRow}
                    maxLanesByRow={calendarLayout.maxLanesByRow}
                    onSelectDate={handleSelectDate}
                    todayDate={today}
                  />
                </SquircleView>
              </Animated.View>

              {/* ─── Selected Day Divider ─── */}
              <Animated.View
                entering={FadeInDown.duration(300).delay(160)}
                style={styles.dayDivider}
              >
                <View
                  style={[
                    styles.dayDividerLine,
                    { backgroundColor: theme.colors.outlineVariant },
                  ]}
                />
                <Text
                  style={[
                    styles.dayDividerText,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {selectedDayLabel}
                </Text>
                <View
                  style={[
                    styles.dayDividerLine,
                    { backgroundColor: theme.colors.outlineVariant },
                  ]}
                />
              </Animated.View>

              {/* ─── Events List ─── */}
              {isLoadingDayEvents ? (
                <SquircleView
                  style={[
                    styles.skeletonEvent,
                    {
                      backgroundColor: theme.colors.surfaceVariant,
                      borderColor: theme.colors.outlineVariant,
                      borderWidth: 1,
                    },
                  ]}
                  cornerSmoothing={1}
                />
              ) : dayEvents.length > 0 ? (
                <View style={styles.eventsList}>
                  {dayEvents.map((event, index) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      index={index}
                      onPress={() => handleEventPress(event)}
                    />
                  ))}
                </View>
              ) : (
                <Animated.View
                  entering={FadeIn.duration(300).delay(200)}
                  style={styles.emptyDay}
                >
                  <SquircleView
                    style={[
                      styles.emptyDayCard,
                      {
                        backgroundColor: theme.dark
                          ? "rgba(255,255,255,0.04)"
                          : "rgba(0,0,0,0.02)",
                        borderColor: theme.colors.outlineVariant,
                        borderWidth: 1,
                      },
                    ]}
                    cornerSmoothing={1}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={28}
                      color={theme.colors.onSurfaceVariant}
                    />
                    <Text
                      style={[
                        styles.emptyDayText,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      Sin eventos este día
                    </Text>
                    {canCreateEvents && (
                      <TouchableOpacity
                        onPress={handleCreateEvent}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.emptyDayAction,
                            { color: theme.colors.primary },
                          ]}
                        >
                          + Crear evento
                        </Text>
                      </TouchableOpacity>
                    )}
                  </SquircleView>
                </Animated.View>
              )}

              {/* ─── Day Photos ─── */}
              <DayPhotosRow photos={dayPhotos} />
            </>
          )}
        </ScrollView>
      </BlurTargetView>
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
  content: {
    paddingHorizontal: 24,
    paddingTop: 0,
  },

  // Title
  titleBlock: {
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
    marginTop: 16,
    marginBottom: 20,
  },

  // Add button
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  // Month Navigator
  monthNavigator: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  monthLabel: {
    fontFamily: "Archivo-Bold",
    fontSize: 18,
    letterSpacing: 0.3,
  },

  // Calendar container
  calendarContainer: {
    borderRadius: 22,
    padding: 16,
    marginBottom: 20,
  },
  calendarGrid: {},
  dayHeaderRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  dayHeaderCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 4,
  },
  dayHeaderText: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  dayRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  dayCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 2,
    justifyContent: "flex-start",
  },
  dayCircleContainer: {
    width: 34,
    height: 34,
    justifyContent: "center",
    alignItems: "center",
  },
  dayBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 17,
  },
  dayText: {
    fontFamily: "Archivo-Medium",
    fontSize: 14,
    textAlign: "center",
  },
  dotRowAbsolute: {
    flexDirection: "row",
    gap: 2,
    position: "absolute",
    bottom: 2,
    alignSelf: "center",
  },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  dotRow: {
    flexDirection: "row",
    gap: 2,
    marginTop: 1,
  },

  // Day divider
  dayDivider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  dayDividerLine: {
    flex: 1,
    height: 1,
  },
  dayDividerText: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 13,
    letterSpacing: 0.3,
  },

  // Events list
  eventsList: {
    gap: 10,
    marginBottom: 20,
  },
  eventCard: {
    borderRadius: 20,
    overflow: "hidden",
    flexDirection: "row",
  },
  eventColorBar: {
    width: 4,
  },
  eventCardBody: {
    flex: 1,
    padding: 14,
    paddingLeft: 12,
  },
  eventTopRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  eventEmoji: {
    fontSize: 28,
  },
  eventTitleBlock: {
    flex: 1,
  },
  eventTitle: {
    fontFamily: "Archivo-Bold",
    fontSize: 15,
  },
  eventTime: {
    fontFamily: "Archivo-Medium",
    fontSize: 12,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  eventBottomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
    flexWrap: "wrap",
  },
  eventChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  eventChipText: {
    fontFamily: "Archivo-Medium",
    fontSize: 11,
    letterSpacing: 0.2,
  },
  miniAvatarRow: {
    flexDirection: "row",
  },
  miniAvatarWrapper: {
    borderRadius: 6,
    overflow: "hidden",
  },

  // Empty day
  emptyDay: {
    marginBottom: 20,
  },
  emptyDayCard: {
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
    gap: 8,
  },
  emptyDayText: {
    fontFamily: "Archivo-Medium",
    fontSize: 13,
    letterSpacing: 0.2,
  },
  emptyDayAction: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 14,
    letterSpacing: 0.2,
    marginTop: 4,
  },

  // Day Photos
  photosSection: {
    marginBottom: 20,
  },
  photosSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  photosSectionTitle: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 13,
    letterSpacing: 0.2,
  },
  photosScroll: {
    gap: 8,
  },
  photoThumb: {
    width: 80,
    height: 80,
    borderRadius: 14,
    overflow: "hidden",
  },
  photoThumbImage: {
    width: 80,
    height: 80,
  },

  // Skeleton
  skeletonWrap: {
    gap: 12,
  },
  skeletonGrid: {
    height: 280,
    borderRadius: 22,
  },
  skeletonEvent: {
    height: 80,
    borderRadius: 20,
  },
});
