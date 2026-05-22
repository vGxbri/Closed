import { Ionicons } from "@expo/vector-icons";
import { BlurTargetView } from "expo-blur";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Text, useTheme } from "react-native-paper";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConfirmDialog, DialogType } from "@/components/ui/ConfirmDialog";
import { CustomHeader } from "@/components/ui/CustomHeader";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useSnackbar } from "@/components/ui/SnackbarContext";
import { useGroup } from "@/hooks";
import { eventsService } from "@/services/events.service";
import { GroupMemberView } from "@/types/database";

// ─── Constants ──────────────────────────────────────────────────────────
const COLORS = [
  "#6366F1", "#EC4899", "#F59E0B", "#10B981",
  "#3B82F6", "#EF4444", "#8B5CF6", "#F97316",
];

const MONTHS_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const DAYS_ES = [
  "Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado",
];

const formatDateES = (date: Date): string =>
  `${DAYS_ES[date.getDay()]} ${date.getDate()} de ${MONTHS_ES[date.getMonth()]}`;

const formatTime = (date: Date): string =>
  `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;

const toLocalDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

function buildEndsAtIso(
  startDate: Date,
  endDate: Date,
  isAllDay: boolean,
): string | undefined {
  const startDay = toLocalDay(startDate);
  const endDay = toLocalDay(endDate);
  if (endDay.getTime() <= startDay.getTime()) {
    return isAllDay ? undefined : endDate.toISOString();
  }
  const end = new Date(endDay);
  if (isAllDay) {
    end.setHours(23, 59, 59, 999);
    return end.toISOString();
  }
  return endDate.toISOString();
}

// ─── Member Row ─────────────────────────────────────────────────────────
interface MemberRowProps {
  member: GroupMemberView;
  selected: boolean;
  onToggle: () => void;
}

const MemberRow = React.memo<MemberRowProps>(({ member, selected, onToggle }) => {
  const theme = useTheme();
  return (
    <TouchableOpacity onPress={onToggle} activeOpacity={0.7} style={styles.memberRow}>
      <UserAvatar
        uri={
          member.group_avatar_url !== undefined && member.group_avatar_url !== null
            ? member.group_avatar_url
            : member.avatar_url
        }
        name={member.group_display_name || member.display_name}
        size={36}
        borderRadius={12}
      />
      <Text style={[styles.memberName, { color: theme.colors.onSurface }]} numberOfLines={1}>
        {member.group_display_name || member.display_name}
      </Text>
      <View
        style={[
          styles.checkbox,
          {
            backgroundColor: selected ? theme.colors.primary : "transparent",
            borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant,
          },
        ]}
      >
        {selected && <Ionicons name="checkmark" size={14} color={theme.colors.onPrimary} />}
      </View>
    </TouchableOpacity>
  );
});
MemberRow.displayName = "MemberRow";

// ─── Main Screen ────────────────────────────────────────────────────────
export default function CreateEventScreen() {
  const { id, date: initialDateStr } = useLocalSearchParams<{ id: string; date?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const backgroundRef = React.useRef(null);
  const { group } = useGroup(id);

  const initialDate = useMemo(() => (initialDateStr ? new Date(initialDateStr) : new Date()), [initialDateStr]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [color, setColor] = useState("#6366F1");
  const [isAllDay, setIsAllDay] = useState(false);
  const [startDate, setStartDate] = useState(initialDate);
  const [endDate, setEndDate] = useState(() => { const d = new Date(initialDate); d.setHours(d.getHours() + 2); return d; });
  const [selectedMembers, setSelectedMembers] = useState<Set<string>>(new Set());
  const [isCreating, setIsCreating] = useState(false);

  const [showStartDate, setShowStartDate] = useState(false);
  const [showStartTime, setShowStartTime] = useState(false);
  const [showEndDate, setShowEndDate] = useState(false);
  const [showEndTime, setShowEndTime] = useState(false);

  const [dialogConfig, setDialogConfig] = useState<{ visible: boolean; title: string; message: string; type: DialogType }>({
    visible: false, title: "", message: "", type: "info",
  });
  const hideDialog = () => setDialogConfig((prev) => ({ ...prev, visible: false }));

  const members = useMemo(() => group?.members || [], [group]);

  const toggleMember = useCallback((userId: string) => {
    setSelectedMembers((prev) => { const next = new Set(prev); if (next.has(userId)) next.delete(userId); else next.add(userId); return next; });
  }, []);

  const selectAll = useCallback(() => { setSelectedMembers(new Set(members.map((m) => m.user_id))); }, [members]);
  const deselectAll = useCallback(() => { setSelectedMembers(new Set()); }, []);

  const handleStartDateChange = useCallback((_: DateTimePickerEvent, date?: Date) => {
    setShowStartDate(false);
    if (date) { const n = new Date(startDate); n.setFullYear(date.getFullYear(), date.getMonth(), date.getDate()); setStartDate(n); if (n >= endDate) { const e = new Date(n); e.setHours(e.getHours() + 2); setEndDate(e); } }
  }, [startDate, endDate]);

  const handleStartTimeChange = useCallback((_: DateTimePickerEvent, date?: Date) => {
    setShowStartTime(false);
    if (date) { const n = new Date(startDate); n.setHours(date.getHours(), date.getMinutes()); setStartDate(n); }
  }, [startDate]);

  const handleEndDateChange = useCallback((_: DateTimePickerEvent, date?: Date) => {
    setShowEndDate(false);
    if (date) { const n = new Date(endDate); n.setFullYear(date.getFullYear(), date.getMonth(), date.getDate()); setEndDate(n); }
  }, [endDate]);

  const handleEndTimeChange = useCallback((_: DateTimePickerEvent, date?: Date) => {
    setShowEndTime(false);
    if (date) { const n = new Date(endDate); n.setHours(date.getHours(), date.getMinutes()); setEndDate(n); }
  }, [endDate]);

  const handleCreate = useCallback(async () => {
    if (!title.trim()) { setDialogConfig({ visible: true, title: "Título requerido", message: "Por favor, escribe un nombre para el evento.", type: "warning" }); return; }
    try {
      setIsCreating(true);
      Keyboard.dismiss();
      await eventsService.createEvent({
        group_id: id, title: title.trim(), description: description.trim() || undefined,
        location: location.trim() || undefined,         starts_at: startDate.toISOString(),
        ends_at: buildEndsAtIso(startDate, endDate, isAllDay),
        is_all_day: isAllDay,
        color, participant_ids: Array.from(selectedMembers),
      });
      showSnackbar("Evento creado", "success");
      router.back();
    } catch (error) {
      console.error("Error creating event:", error);
      setDialogConfig({ visible: true, title: "Error", message: error instanceof Error ? error.message : "No se pudo crear el evento.", type: "error" });
    } finally { setIsCreating(false); }
  }, [id, title, description, location, startDate, endDate, isAllDay, color, selectedMembers, showSnackbar, router]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <BlurTargetView ref={backgroundRef} style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <CustomHeader title="" showBackButton={true} />
        <ScrollView style={styles.scrollView} contentContainerStyle={[styles.content, { paddingBottom: 120 + insets.bottom }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

          {/* Title */}
          <Animated.View entering={FadeIn.duration(500)} style={styles.titleBlock}>
            <Text style={[styles.screenTitle, { color: theme.colors.primary }]}>Nuevo Evento</Text>
          </Animated.View>
          <Animated.View entering={FadeIn.duration(400).delay(50)} style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />



          {/* Title Input */}
          <Animated.View entering={FadeInDown.duration(300).delay(120)} style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>Nombre del evento *</Text>
            <SquircleView style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant, borderWidth: 1 }]} cornerSmoothing={1}>
              <TextInput value={title} onChangeText={setTitle} placeholder="Ej: Cena de grupo" placeholderTextColor={theme.colors.onSurfaceVariant} style={[styles.input, { color: theme.colors.onSurface }]} maxLength={100} />
            </SquircleView>
          </Animated.View>

          {/* Date/Time */}
          <Animated.View entering={FadeInDown.duration(300).delay(160)} style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>Fecha y hora</Text>
            <View style={styles.toggleRow}>
              <Text style={[styles.toggleLabel, { color: theme.colors.onSurface }]}>Todo el día</Text>
              <Switch value={isAllDay} onValueChange={setIsAllDay} trackColor={{ false: theme.colors.surfaceVariant, true: theme.colors.primaryContainer }} thumbColor={isAllDay ? theme.colors.primary : theme.colors.onSurfaceVariant} />
            </View>

            {/* Start */}
            <SquircleView style={[styles.dateCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant, borderWidth: 1 }]} cornerSmoothing={1}>
              <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
              <View style={styles.dateInfo}>
                <Text style={[styles.dateLabel, { color: theme.colors.onSurfaceVariant }]}>Inicio</Text>
                <View style={styles.dateValueRow}>
                  <TouchableOpacity onPress={() => setShowStartDate(true)} activeOpacity={0.7}>
                    <Text style={[styles.dateValue, { color: theme.colors.onSurface }]}>{formatDateES(startDate)}</Text>
                  </TouchableOpacity>
                  {!isAllDay && (
                    <TouchableOpacity onPress={() => setShowStartTime(true)} activeOpacity={0.7}>
                      <Text style={[styles.timeValue, { color: theme.colors.primary }]}>{formatTime(startDate)}</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </SquircleView>

            {/* End */}
            <SquircleView
              style={[
                styles.dateCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant,
                  borderWidth: 1,
                  marginTop: 8,
                },
              ]}
              cornerSmoothing={1}
            >
              <Ionicons
                name={isAllDay ? "calendar-outline" : "time-outline"}
                size={18}
                color={theme.colors.onSurfaceVariant}
              />
              <View style={styles.dateInfo}>
                <Text style={[styles.dateLabel, { color: theme.colors.onSurfaceVariant }]}>
                  Fin
                </Text>
                <View style={styles.dateValueRow}>
                  <TouchableOpacity
                    onPress={() => setShowEndDate(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.dateValue, { color: theme.colors.onSurface }]}>
                      {formatDateES(endDate)}
                    </Text>
                  </TouchableOpacity>
                  {!isAllDay && (
                    <TouchableOpacity
                      onPress={() => setShowEndTime(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.timeValue, { color: theme.colors.primary }]}>
                        {formatTime(endDate)}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </SquircleView>

            {showStartDate && <DateTimePicker value={startDate} mode="date" display={Platform.OS === "ios" ? "spinner" : "default"} onChange={handleStartDateChange} />}
            {showStartTime && <DateTimePicker value={startDate} mode="time" is24Hour display={Platform.OS === "ios" ? "spinner" : "default"} onChange={handleStartTimeChange} />}
            {showEndDate && <DateTimePicker value={endDate} mode="date" display={Platform.OS === "ios" ? "spinner" : "default"} onChange={handleEndDateChange} minimumDate={startDate} />}
            {showEndTime && <DateTimePicker value={endDate} mode="time" is24Hour display={Platform.OS === "ios" ? "spinner" : "default"} onChange={handleEndTimeChange} />}
          </Animated.View>

          {/* Location */}
          <Animated.View entering={FadeInDown.duration(300).delay(200)} style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>Ubicación</Text>
            <SquircleView style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant, borderWidth: 1 }]} cornerSmoothing={1}>
              <Ionicons name="location-outline" size={18} color={theme.colors.onSurfaceVariant} style={{ marginRight: 8 }} />
              <TextInput value={location} onChangeText={setLocation} placeholder="Ej: Restaurante La Roca" placeholderTextColor={theme.colors.onSurfaceVariant} style={[styles.input, { color: theme.colors.onSurface, flex: 1 }]} maxLength={200} />
            </SquircleView>
          </Animated.View>

          {/* Description */}
          <Animated.View entering={FadeInDown.duration(300).delay(240)} style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>Descripción</Text>
            <SquircleView style={[styles.inputContainer, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant, borderWidth: 1, minHeight: 80 }]} cornerSmoothing={1}>
              <TextInput value={description} onChangeText={setDescription} placeholder="Detalles del evento..." placeholderTextColor={theme.colors.onSurfaceVariant} style={[styles.input, { color: theme.colors.onSurface, textAlignVertical: "top", minHeight: 60 }]} multiline maxLength={500} />
            </SquircleView>
          </Animated.View>

          {/* Color */}
          <Animated.View entering={FadeInDown.duration(300).delay(280)} style={styles.section}>
            <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>Color</Text>
            <View style={styles.colorRow}>
              {COLORS.map((c) => (
                <TouchableOpacity key={c} onPress={() => setColor(c)} activeOpacity={0.7}>
                  <View style={[styles.colorCircle, { backgroundColor: c, borderColor: color === c ? theme.colors.onSurface : "transparent", borderWidth: color === c ? 2.5 : 0 }]}>
                    {color === c && <Ionicons name="checkmark" size={16} color="#FFFFFF" />}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </Animated.View>

          {/* Participants */}
          <Animated.View entering={FadeInDown.duration(300).delay(320)} style={styles.section}>
            <View style={styles.participantsHeader}>
              <Text style={[styles.sectionLabel, { color: theme.colors.onSurfaceVariant }]}>Participantes ({selectedMembers.size}/{members.length})</Text>
              <TouchableOpacity onPress={selectedMembers.size === members.length ? deselectAll : selectAll} activeOpacity={0.7}>
                <Text style={[styles.selectAllText, { color: theme.colors.primary }]}>{selectedMembers.size === members.length ? "Deseleccionar" : "Seleccionar todos"}</Text>
              </TouchableOpacity>
            </View>
            <SquircleView style={[styles.membersList, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant, borderWidth: 1 }]} cornerSmoothing={1}>
              {members.map((member) => (
                <MemberRow key={member.user_id} member={member} selected={selectedMembers.has(member.user_id)} onToggle={() => toggleMember(member.user_id)} />
              ))}
            </SquircleView>
          </Animated.View>

        </ScrollView>

        {/* Footer */}
        <Animated.View entering={FadeIn.duration(400).delay(400)} style={[styles.footer, { paddingBottom: insets.bottom + 16, borderTopColor: theme.colors.outlineVariant }]}>
          <Pressable onPress={handleCreate} disabled={isCreating || !title.trim()} style={({ pressed }) => [{ opacity: pressed ? 0.9 : (isCreating || !title.trim()) ? 0.5 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
            <SquircleView style={[styles.createButton, { backgroundColor: theme.colors.primary }]} cornerSmoothing={1}>
              {isCreating ? (
                <Text style={[styles.createButtonText, { color: theme.colors.onPrimary }]}>Creando...</Text>
              ) : (
                <>
                  <Ionicons name="add-circle" size={20} color={theme.colors.onPrimary} />
                  <Text style={[styles.createButtonText, { color: theme.colors.onPrimary }]}>Crear Evento</Text>
                </>
              )}
            </SquircleView>
          </Pressable>
        </Animated.View>

        <ConfirmDialog visible={dialogConfig.visible} title={dialogConfig.title} message={dialogConfig.message} type={dialogConfig.type} onConfirm={hideDialog} onCancel={hideDialog} confirmText="Entendido" showCancel={false} blurTargetRef={backgroundRef} />
      </BlurTargetView>
    </>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 0 },
  titleBlock: { marginTop: 4, marginBottom: 4 },
  screenTitle: { fontFamily: "InstrumentSerif-Italic", fontSize: 38, letterSpacing: 0.5, lineHeight: 44 },
  divider: { height: 1, marginTop: 16, marginBottom: 20 },
  section: { marginBottom: 20 },
  sectionLabel: { fontFamily: "Archivo-SemiBold", fontSize: 13, letterSpacing: 0.3, marginBottom: 10 },
  emojiRow: { gap: 8, paddingVertical: 2 },
  emojiCell: { width: 44, height: 44, borderRadius: 14, justifyContent: "center", alignItems: "center" },
  emojiText: { fontSize: 22 },
  inputContainer: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12, flexDirection: "row", alignItems: "center" },
  input: { fontFamily: "Archivo-Medium", fontSize: 15, flex: 1, padding: 0 },
  toggleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  toggleLabel: { fontFamily: "Archivo-Medium", fontSize: 14 },
  dateCard: { borderRadius: 16, padding: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  dateInfo: { flex: 1 },
  dateLabel: { fontFamily: "Archivo-Medium", fontSize: 11, letterSpacing: 0.3, marginBottom: 2 },
  dateValueRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dateValue: { fontFamily: "Archivo-SemiBold", fontSize: 14 },
  timeValue: { fontFamily: "Archivo-Bold", fontSize: 14 },
  colorRow: { flexDirection: "row", gap: 12, flexWrap: "wrap" },
  colorCircle: { width: 34, height: 34, borderRadius: 17, justifyContent: "center", alignItems: "center" },
  participantsHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  selectAllText: { fontFamily: "Archivo-SemiBold", fontSize: 13 },
  membersList: { borderRadius: 18, overflow: "hidden" },
  memberRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingVertical: 10, gap: 12 },
  memberName: { fontFamily: "Archivo-Medium", fontSize: 14, flex: 1 },
  checkbox: { width: 22, height: 22, borderRadius: 7, borderWidth: 1.5, justifyContent: "center", alignItems: "center" },
  footer: { paddingHorizontal: 24, paddingTop: 12, borderTopWidth: 1 },
  createButton: { borderRadius: 16, paddingVertical: 16, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 8 },
  createButtonText: { fontFamily: "Archivo-Bold", fontSize: 16, letterSpacing: 0.3 },
});
