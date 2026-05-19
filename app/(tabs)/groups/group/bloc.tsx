import { Ionicons } from "@expo/vector-icons";
import { BlurTargetView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import {
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

import { BottomSheetModal } from "../../../../components/ui/BottomSheetModal";
import { ConfirmDialog } from "../../../../components/ui/ConfirmDialog";
import { CustomHeader } from "../../../../components/ui/CustomHeader";
import { useSnackbar } from "../../../../components/ui/SnackbarContext";
import { useAuth, useGroup } from "../../../../hooks";
import { notesService } from "../../../../services/notes.service";
import { Note, NoteBlock } from "../../../../types/database";

// ─── Helpers ────────────────────────────────────────────────────────────
const formatRelativeDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Ahora";
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Hace ${days}d`;
  return date.toLocaleDateString("es-ES", { day: "numeric", month: "short" });
};

const getContentPreview = (content: NoteBlock[]): string => {
  if (!content || content.length === 0) return "Nota vacía";
  for (const block of content) {
    if (block.type === "text" || block.type === "heading") {
      if (block.value.trim()) return block.value.trim();
    }
    if (block.type === "checklist" && block.items && block.items.length > 0) {
      const first = block.items[0];
      const total = block.items.length;
      const checked = block.items.filter((i) => i.checked).length;
      return `☑ ${first.text}${total > 1 ? ` (+${total - 1} más)` : ""} · ${checked}/${total}`;
    }
  }
  return "Nota vacía";
};

const getChecklistProgress = (
  content: NoteBlock[]
): { total: number; checked: number } | null => {
  let total = 0;
  let checked = 0;
  for (const block of content) {
    if (block.type === "checklist" && block.items) {
      total += block.items.length;
      checked += block.items.filter((i) => i.checked).length;
    }
  }
  return total > 0 ? { total, checked } : null;
};

// ─── Skeleton ───────────────────────────────────────────────────────────
const SkeletonCard = React.memo<{ index: number }>(({ index }) => {
  const theme = useTheme();
  return (
    <Animated.View entering={FadeIn.duration(400).delay(index * 80)}>
      <SquircleView
        style={[
          styles.noteCard,
          {
            backgroundColor: theme.colors.surfaceVariant,
            borderColor: theme.colors.outlineVariant,
            borderWidth: 1,
            height: 100,
          },
        ]}
        cornerSmoothing={1}
      />
    </Animated.View>
  );
});
SkeletonCard.displayName = "SkeletonCard";

// ─── Note Card ──────────────────────────────────────────────────────────
interface NoteCardProps {
  note: Note;
  index: number;
  onPress: () => void;
  onLongPress: () => void;
}

const NoteCard = React.memo<NoteCardProps>(
  ({ note, index, onPress, onLongPress }) => {
    const theme = useTheme();
    const preview = useMemo(() => getContentPreview(note.content), [note.content]);
    const progress = useMemo(
      () => getChecklistProgress(note.content),
      [note.content]
    );

    return (
      <Animated.View
        entering={FadeInDown.duration(350).delay(80 + index * 50)}
      >
        <Pressable
          onPress={onPress}
          onLongPress={onLongPress}
          delayLongPress={500}
          style={({ pressed }) => [
            {
              opacity: pressed ? 0.92 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
        >
          <SquircleView
            style={[
              styles.noteCard,
              {
                backgroundColor: theme.colors.surface,
                borderColor: note.is_pinned
                  ? theme.colors.primary
                  : theme.colors.outlineVariant,
                borderWidth: note.is_pinned ? 1.5 : 1,
              },
            ]}
            cornerSmoothing={1}
          >
            {/* Pin indicator */}
            {note.is_pinned && (
              <View style={styles.pinBadge}>
                <Ionicons
                  name="pin"
                  size={12}
                  color={theme.colors.primary}
                />
              </View>
            )}

            {/* Title */}
            <Text
              style={[styles.noteTitle, { color: theme.colors.onSurface }]}
              numberOfLines={1}
            >
              {note.title || "Sin título"}
            </Text>

            {/* Preview */}
            <Text
              style={[
                styles.notePreview,
                { color: theme.colors.onSurfaceVariant },
              ]}
              numberOfLines={2}
            >
              {preview}
            </Text>

            {/* Footer: date + checklist progress */}
            <View style={styles.noteFooter}>
              <Text
                style={[
                  styles.noteDate,
                  { color: theme.colors.outline },
                ]}
              >
                {formatRelativeDate(note.updated_at)}
              </Text>

              {progress && (
                <View style={styles.progressChip}>
                  <View
                    style={[
                      styles.progressBarBg,
                      { backgroundColor: theme.colors.outlineVariant },
                    ]}
                  >
                    <View
                      style={[
                        styles.progressBarFill,
                        {
                          backgroundColor: theme.colors.primary,
                          width: `${(progress.checked / progress.total) * 100}%`,
                        },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.progressText,
                      { color: theme.colors.outline },
                    ]}
                  >
                    {progress.checked}/{progress.total}
                  </Text>
                </View>
              )}
            </View>
          </SquircleView>
        </Pressable>
      </Animated.View>
    );
  }
);
NoteCard.displayName = "NoteCard";

// ─── Main Screen ────────────────────────────────────────────────────────
export default function BlocScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const { user } = useAuth();
  const { isAdmin } = useGroup(id);

  const backgroundRef = React.useRef(null);
  const isFirstLoadRef = useRef(true);

  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [longPressedNote, setLongPressedNote] = useState<Note | null>(null);

  // ─── Fetch notes ──────────────────────────────
  const fetchNotes = useCallback(async () => {
    if (!id) return;
    try {
      if (isFirstLoadRef.current) {
        setIsLoading(true);
      }
      const data = await notesService.getNotes(id);
      setNotes(data);
      isFirstLoadRef.current = false;
    } catch (e) {
      console.error("Error loading notes:", e);
      showSnackbar("Error al cargar las notas", "error");
    } finally {
      setIsLoading(false);
    }
  }, [id, showSnackbar]);

  useFocusEffect(
    useCallback(() => {
      fetchNotes();
    }, [fetchNotes])
  );

  // ─── Create note ──────────────────────────────
  const handleCreateNote = useCallback(async () => {
    if (!id) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const note = await notesService.createNote(id);
      router.push({
        pathname: "/groups/group/noteEditor",
        params: { id, noteId: note.id, isNew: "true" },
      } as any);
    } catch (e) {
      console.error("Error creating note:", e);
      showSnackbar("Error al crear la nota", "error");
    }
  }, [id, router, showSnackbar]);

  // ─── Open note ────────────────────────────────
  const handleOpenNote = useCallback(
    (note: Note) => {
      router.push({
        pathname: "/groups/group/noteEditor",
        params: { id, noteId: note.id },
      } as any);
    },
    [router, id]
  );

  // ─── Long press actions ───────────────────────
  const handleLongPress = useCallback(
    (note: Note) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setLongPressedNote(note);
      setModalVisible(true);
    },
    []
  );

  // ─── Delete note ──────────────────────────────
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await notesService.deleteNote(deleteTarget.id);
      setNotes((prev) => prev.filter((n) => n.id !== deleteTarget.id));
      showSnackbar("Nota eliminada", "success");
    } catch (e) {
      console.error("Error deleting note:", e);
      showSnackbar("Error al eliminar la nota", "error");
    }
    setDeleteTarget(null);
  }, [deleteTarget, showSnackbar]);

  // ─── Filtered notes ───────────────────────────
  const filteredNotes = useMemo(() => {
    if (!searchQuery.trim()) return notes;
    const q = searchQuery.toLowerCase();
    return notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        getContentPreview(n.content).toLowerCase().includes(q)
    );
  }, [notes, searchQuery]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <BlurTargetView
        ref={backgroundRef}
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <CustomHeader title="" showBackButton={true} />

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
            <Text
              style={[styles.screenTitle, { color: theme.colors.primary }]}
            >
              Bloc
            </Text>
            <Text
              style={[
                styles.screenSubtitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {isLoading
                ? "Cargando..."
                : `${notes.length} nota${notes.length !== 1 ? "s" : ""}`}
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

          {/* ─── Search ─── */}
          {!isLoading && notes.length > 0 && (
            <Animated.View
              entering={FadeInDown.duration(300).delay(60)}
              style={styles.searchContainer}
            >
              <SquircleView
                style={[
                  styles.searchBox,
                  {
                    backgroundColor: theme.colors.surfaceVariant,
                    borderColor: theme.colors.outlineVariant,
                    borderWidth: 1,
                  },
                ]}
                cornerSmoothing={1}
              >
                <Ionicons
                  name="search-outline"
                  size={18}
                  color={theme.colors.outline}
                />
                <TextInput
                  style={[styles.searchInput, { color: theme.colors.onSurface }]}
                  placeholder="Buscar notas..."
                  placeholderTextColor={theme.colors.outline}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
                {searchQuery.length > 0 && (
                  <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
                    <Ionicons
                      name="close-circle"
                      size={18}
                      color={theme.colors.outline}
                    />
                  </Pressable>
                )}
              </SquircleView>
            </Animated.View>
          )}

          {/* ─── Content ─── */}
          {isLoading ? (
            <View style={styles.noteList}>
              {[0, 1, 2, 3].map((i) => (
                <SkeletonCard key={i} index={i} />
              ))}
            </View>
          ) : filteredNotes.length === 0 ? (
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
                    name="document-text-outline"
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
                  {searchQuery ? "Sin resultados" : "Aún no hay notas"}
                </Text>
                <Text
                  style={[
                    styles.emptySubtitle,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {searchQuery
                    ? "Prueba con otra búsqueda"
                    : "Crea una nota para empezar a organizar ideas con tu grupo."}
                </Text>

                {!searchQuery && (
                  <Pressable
                    onPress={handleCreateNote}
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
                        Crear nota
                      </Text>
                    </SquircleView>
                  </Pressable>
                )}
              </SquircleView>
            </Animated.View>
          ) : (
            <View style={styles.noteList}>
              {filteredNotes.map((note, index) => (
                <NoteCard
                  key={note.id}
                  note={note}
                  index={index}
                  onPress={() => handleOpenNote(note)}
                  onLongPress={() => handleLongPress(note)}
                />
              ))}
            </View>
          )}
        </ScrollView>

        {/* ─── FAB ─── */}
        {!isLoading && filteredNotes.length > 0 && (
          <Animated.View
            entering={FadeIn.duration(400).delay(300)}
            style={[
              styles.fabContainer,
              { bottom: Math.max(insets.bottom + 24, 40) },
            ]}
          >
            <Pressable
              onPress={handleCreateNote}
              style={({ pressed }) => [
                {
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.92 : 1 }],
                },
              ]}
            >
              <SquircleView
                style={[
                  styles.fab,
                  {
                    backgroundColor: theme.colors.primary,
                    shadowColor: theme.colors.primary,
                  },
                ]}
                cornerSmoothing={1}
              >
                <Ionicons
                  name="add"
                  size={28}
                  color={theme.colors.onPrimary}
                />
              </SquircleView>
            </Pressable>
          </Animated.View>
        )}
      </BlurTargetView>

      {/* Options Modal */}
      <BottomSheetModal
        visible={modalVisible}
        onDismiss={() => {
          setModalVisible(false);
          setLongPressedNote(null);
        }}
        blurTarget={backgroundRef}
      >
        {longPressedNote && (
          <View style={[styles.modalContent, { paddingBottom: Math.max(insets.bottom + 24, 40) }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
              {longPressedNote.title || "Nota sin título"}
            </Text>

            <SquircleView
              style={[
                styles.modalMenuCard,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  borderColor: theme.colors.outlineVariant,
                  borderWidth: 1,
                },
              ]}
              cornerSmoothing={1}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.modalOption,
                  { backgroundColor: pressed ? theme.colors.outlineVariant : "transparent" },
                ]}
                onPress={() => {
                  setModalVisible(false);
                  notesService
                    .togglePin(longPressedNote.id, longPressedNote.is_pinned)
                    .then(() => {
                      setNotes((prev) =>
                        prev.map((n) =>
                          n.id === longPressedNote.id
                            ? { ...n, is_pinned: !n.is_pinned }
                            : n
                        )
                      );
                      showSnackbar(
                        longPressedNote.is_pinned
                          ? "Nota desanclada"
                          : "Nota anclada",
                        "success"
                      );
                    })
                    .catch(() => showSnackbar("Error al fijar la nota", "error"));
                }}
              >
                <SquircleView
                  style={[styles.modalIconBox, { backgroundColor: theme.colors.surface }]}
                  cornerSmoothing={1}
                >
                  <Ionicons
                    name={longPressedNote.is_pinned ? "pin-outline" : "pin"}
                    size={20}
                    color={theme.colors.onSurface}
                  />
                </SquircleView>
                <Text
                  style={[styles.modalOptionText, { color: theme.colors.onSurface }]}
                >
                  {longPressedNote.is_pinned ? "Desanclar nota" : "Anclar nota"}
                </Text>
              </Pressable>

              {(longPressedNote.created_by === user?.id || isAdmin) && (
                <>
                  <View style={[styles.modalDivider, { backgroundColor: theme.colors.outlineVariant }]} />
                  <Pressable
                    style={({ pressed }) => [
                      styles.modalOption,
                      { backgroundColor: pressed ? theme.colors.outlineVariant : "transparent" },
                    ]}
                    onPress={() => {
                      setModalVisible(false);
                      setTimeout(() => setDeleteTarget(longPressedNote), 300);
                    }}
                  >
                    <SquircleView
                      style={[styles.modalIconBox, { backgroundColor: theme.colors.errorContainer }]}
                      cornerSmoothing={1}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color={theme.colors.error}
                      />
                    </SquircleView>
                    <Text
                      style={[styles.modalOptionText, { color: theme.colors.error }]}
                    >
                      Eliminar nota
                    </Text>
                  </Pressable>
                </>
              )}
            </SquircleView>
          </View>
        )}
      </BottomSheetModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        visible={!!deleteTarget}
        title="Eliminar nota"
        message={`¿Eliminar "${deleteTarget?.title || "Sin título"}"? Esta acción no se puede deshacer.`}
        type="error"
        confirmText="Eliminar"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        showCancel={true}
        blurTargetRef={backgroundRef}
      />
    </>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  content: { paddingHorizontal: 24, paddingTop: 0 },

  // Title
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

  // Divider
  divider: { height: 1, marginTop: 16, marginBottom: 20 },

  // Search
  searchContainer: { marginBottom: 18 },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Archivo-Medium",
    fontSize: 15,
    paddingVertical: 0,
  },

  // Note List
  noteList: { gap: 12 },

  // Note Card
  noteCard: {
    borderRadius: 20,
    padding: 18,
  },
  pinBadge: {
    position: "absolute",
    top: 14,
    right: 14,
  },
  noteTitle: {
    fontFamily: "Archivo-Bold",
    fontSize: 16,
    marginBottom: 6,
    paddingRight: 24,
  },
  notePreview: {
    fontFamily: "Archivo-Medium",
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 10,
  },
  noteFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  noteDate: {
    fontFamily: "Archivo-Medium",
    fontSize: 11,
    letterSpacing: 0.2,
  },
  progressChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  progressBarBg: {
    width: 40,
    height: 4,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  progressText: {
    fontFamily: "Archivo-Medium",
    fontSize: 11,
  },

  // Empty State
  emptyContainer: { marginTop: 20 },
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

  // FAB
  fabContainer: {
    position: "absolute",
    right: 24,
    zIndex: 99,
    elevation: 6,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },

  // Modal
  modalContent: {
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  modalTitle: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 26,
    marginBottom: 20,
    textAlign: "center",
  },
  modalMenuCard: {
    borderRadius: 24,
    padding: 8,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  modalIconBox: {
    width: 40,
    height: 40,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOptionText: {
    fontFamily: "Archivo-Medium",
    fontSize: 16,
    letterSpacing: 0.2,
  },
  modalDivider: {
    height: 1,
    marginHorizontal: 16,
    marginVertical: 4,
  },
});
