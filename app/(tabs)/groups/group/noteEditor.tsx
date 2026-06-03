import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Text, useTheme } from "react-native-paper";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CustomHeader } from "@/components/ui/CustomHeader";
import { useSnackbar } from "@/components/ui/SnackbarContext";
import { useAuth, useGroup } from "@/hooks";
import { notesService } from "@/services/notes.service";
import { ChecklistItem, Note, NoteBlock } from "@/types/database";

// ─── ID Generator ───────────────────────────────────────────────────────
const genId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ─── Block Components ───────────────────────────────────────────────────

// Text Block
interface TextBlockProps {
  block: NoteBlock;
  onChangeValue: (value: string) => void;
  onRemove: () => void;
  autoFocus?: boolean;
}

const TextBlockEditor = React.memo<TextBlockProps>(
  ({ block, onChangeValue, onRemove, autoFocus }) => {
    const theme = useTheme();
    const isHeading = block.type === "heading";

    return (
      <View style={styles.blockContainer}>
        <TextInput
          style={[
            isHeading ? styles.headingInput : styles.textInput,
            { color: theme.colors.onSurface },
          ]}
          placeholder={isHeading ? "Subtítulo..." : "Escribe aquí..."}
          placeholderTextColor={theme.colors.outline}
          value={block.value}
          onChangeText={onChangeValue}
          multiline
          autoFocus={autoFocus}
          textAlignVertical="top"
        />
        <Pressable
          onPress={onRemove}
          style={styles.blockRemoveBtn}
          hitSlop={8}
        >
          <Ionicons
            name="close-circle"
            size={18}
            color={theme.colors.outline}
          />
        </Pressable>
      </View>
    );
  }
);
TextBlockEditor.displayName = "TextBlockEditor";

// Checklist Block
interface ChecklistBlockProps {
  block: NoteBlock;
  onUpdateItems: (items: ChecklistItem[]) => void;
  onRemove: () => void;
}

const ChecklistBlockEditor = React.memo<ChecklistBlockProps>(
  ({ block, onUpdateItems, onRemove }) => {
    const theme = useTheme();
    const items = block.items || [];
    const [newItemText, setNewItemText] = useState("");
    const inputRef = useRef<TextInput>(null);

    const toggleItem = useCallback(
      (itemId: string) => {
        Haptics.selectionAsync();
        const updated = items.map((i) =>
          i.id === itemId ? { ...i, checked: !i.checked } : i
        );
        onUpdateItems(updated);
      },
      [items, onUpdateItems]
    );

    const updateItemText = useCallback(
      (itemId: string, text: string) => {
        const updated = items.map((i) =>
          i.id === itemId ? { ...i, text } : i
        );
        onUpdateItems(updated);
      },
      [items, onUpdateItems]
    );

    const removeItem = useCallback(
      (itemId: string) => {
        onUpdateItems(items.filter((i) => i.id !== itemId));
      },
      [items, onUpdateItems]
    );

    const addItem = useCallback(() => {
      if (!newItemText.trim()) return;
      const newItem: ChecklistItem = {
        id: genId(),
        text: newItemText.trim(),
        checked: false,
      };
      onUpdateItems([...items, newItem]);
      setNewItemText("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }, [newItemText, items, onUpdateItems]);

    return (
      <View style={styles.blockContainer}>
        <View style={styles.checklistHeader}>
          <Text
            style={[styles.checklistTitle, { color: theme.colors.onSurface }]}
          >
            Lista
          </Text>
          <Pressable onPress={onRemove} hitSlop={8}>
            <Ionicons
              name="close-circle"
              size={18}
              color={theme.colors.outline}
            />
          </Pressable>
        </View>

        {items.map((item) => (
          <View key={item.id} style={styles.checklistItem}>
            <Pressable
              onPress={() => toggleItem(item.id)}
              style={styles.checkbox}
            >
              <Ionicons
                name={item.checked ? "checkbox" : "square-outline"}
                size={22}
                color={
                  item.checked
                    ? theme.colors.primary
                    : theme.colors.outline
                }
              />
            </Pressable>
            <TextInput
              style={[
                styles.checklistItemInput,
                {
                  color: item.checked
                    ? theme.colors.outline
                    : theme.colors.onSurface,
                  textDecorationLine: item.checked ? "line-through" : "none",
                },
              ]}
              value={item.text}
              onChangeText={(text) => updateItemText(item.id, text)}
              placeholder="Elemento..."
              placeholderTextColor={theme.colors.outline}
            />
            <Pressable
              onPress={() => removeItem(item.id)}
              hitSlop={8}
              style={styles.checklistRemoveBtn}
            >
              <Ionicons name="remove-circle-outline" size={18} color={theme.colors.outline} />
            </Pressable>
          </View>
        ))}

        {/* Add new item */}
        <View style={styles.checklistAddRow}>
          <Ionicons
            name="add-circle-outline"
            size={20}
            color={theme.colors.primary}
          />
          <TextInput
            ref={inputRef}
            style={[styles.checklistAddInput, { color: theme.colors.onSurface }]}
            placeholder="Añadir elemento..."
            placeholderTextColor={theme.colors.outline}
            value={newItemText}
            onChangeText={setNewItemText}
            onSubmitEditing={addItem}
            returnKeyType="done"
          />
        </View>
      </View>
    );
  }
);
ChecklistBlockEditor.displayName = "ChecklistBlockEditor";

// ─── Main Screen ────────────────────────────────────────────────────────
export default function NoteEditorScreen() {
  const { id, noteId, isNew } = useLocalSearchParams<{
    id: string;
    noteId: string;
    isNew?: string;
  }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { showSnackbar } = useSnackbar();
  const { user } = useAuth();
  const { isAdmin } = useGroup(id);

  const [note, setNote] = useState<Note | null>(null);
  const [title, setTitle] = useState("");
  const [blocks, setBlocks] = useState<NoteBlock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [lastFocusedBlockId, setLastFocusedBlockId] = useState<string | null>(null);

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasChangesRef = useRef(false);
  
  // Track state for the unmount cleanup to avoid capturing stale values
  const unmountStateRef = useRef({ title: "", blocks: [] as NoteBlock[] });
  
  useEffect(() => {
    unmountStateRef.current = { title, blocks };
  }, [title, blocks]);

  // ─── Load note ────────────────────────────────
  useEffect(() => {
    if (!noteId) return;
    let mounted = true;

    const load = async () => {
      try {
        const data = await notesService.getNote(noteId);
        if (mounted && data) {
          setNote(data);
          setTitle(data.title);
          setBlocks(data.content);
        }
      } catch (e) {
        console.error("Error loading note:", e);
        showSnackbar("Error al cargar la nota", "error");
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    load();

    return () => {
      mounted = false;
    };
  }, [noteId, showSnackbar]);

  // ─── Auto-save with debounce ──────────────────
  const triggerSave = useCallback(
    (newTitle: string, newBlocks: NoteBlock[]) => {
      if (!noteId) return;
      hasChangesRef.current = true;

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      saveTimerRef.current = setTimeout(async () => {
        try {
          setIsSaving(true);
          await notesService.updateNote(noteId, {
            title: newTitle,
            content: newBlocks,
          });
          hasChangesRef.current = false;
        } catch (e) {
          console.error("Error saving note:", e);
        } finally {
          setIsSaving(false);
        }
      }, 1500);
    },
    [noteId]
  );

  // Save on unmount if pending changes, or delete if empty and new
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      
      if (!noteId) return;

      const { title: finalTitle, blocks: finalBlocks } = unmountStateRef.current;
      
      const isEmpty = !finalTitle.trim() && finalBlocks.every(b => {
        if (b.type === 'checklist') return !b.items || b.items.length === 0;
        return !b.value.trim();
      });

      if (isEmpty && isNew === "true") {
        notesService.deleteNote(noteId).catch((e) => console.error("Error deleting empty note on unmount:", e));
      } else if (hasChangesRef.current) {
        notesService
          .updateNote(noteId, { title: finalTitle, content: finalBlocks })
          .catch((e) => console.error("Error saving on unmount:", e));
      }
    };
  }, [noteId, isNew]);

  // ─── Title change ─────────────────────────────
  const handleTitleChange = useCallback(
    (text: string) => {
      setTitle(text);
      triggerSave(text, blocks);
    },
    [blocks, triggerSave]
  );

  // ─── Block mutations ──────────────────────────
  const updateBlock = useCallback(
    (blockId: string, updates: Partial<NoteBlock>) => {
      setBlocks((prev) => {
        const next = prev.map((b) =>
          b.id === blockId ? { ...b, ...updates } : b
        );
        triggerSave(title, next);
        return next;
      });
    },
    [title, triggerSave]
  );

  const removeBlock = useCallback(
    (blockId: string) => {
      setBlocks((prev) => {
        const next = prev.filter((b) => b.id !== blockId);
        triggerSave(title, next);
        return next;
      });
    },
    [title, triggerSave]
  );

  const addBlock = useCallback(
    (type: NoteBlock["type"]) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const newBlock: NoteBlock = {
        id: genId(),
        type,
        value: "",
        ...(type === "checklist" ? { items: [] } : {}),
      };
      setBlocks((prev) => {
        const next = [...prev, newBlock];
        triggerSave(title, next);
        return next;
      });
      setLastFocusedBlockId(newBlock.id);
    },
    [title, triggerSave]
  );

  // ─── Delete note ──────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!noteId) return;
    try {
      // Cancel any pending save
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      hasChangesRef.current = false;

      await notesService.deleteNote(noteId);
      showSnackbar("Nota eliminada", "success");
      router.back();
    } catch (e) {
      console.error("Error deleting note:", e);
      showSnackbar("Error al eliminar la nota", "error");
    }
    setShowDeleteDialog(false);
  }, [noteId, showSnackbar, router]);

  // ─── Pin toggle ───────────────────────────────
  const handleTogglePin = useCallback(async () => {
    if (!note) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await notesService.togglePin(note.id, note.is_pinned);
      setNote((prev) =>
        prev ? { ...prev, is_pinned: !prev.is_pinned } : prev
      );
      showSnackbar(
        note.is_pinned ? "Nota desanclada" : "Nota anclada",
        "success"
      );
    } catch (e) {
      showSnackbar("Error al fijar la nota", "error");
    }
  }, [note, showSnackbar]);

  const canDelete = useMemo(() => {
    if (!note || !user) return false;
    return note.created_by === user.id || isAdmin;
  }, [note, user, isAdmin]);

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
          <CustomHeader title="" showBackButton={true} />
          <View style={styles.loadingContainer}>
            {[0, 1, 2].map((i) => (
              <Animated.View
                key={i}
                entering={FadeIn.duration(400).delay(i * 80)}
              >
                <View
                  style={[
                    styles.skeletonBlock,
                    { backgroundColor: theme.colors.surfaceVariant },
                  ]}
                />
              </Animated.View>
            ))}
          </View>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <View
        style={[
          styles.container,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <CustomHeader
          title=""
          showBackButton={true}
          rightAction={
            <View style={styles.headerActions}>
              {/* Save indicator */}
              {isSaving && (
                <Animated.View entering={FadeIn.duration(200)}>
                  <Text
                    style={[
                      styles.savingText,
                      { color: theme.colors.outline },
                    ]}
                  >
                    Guardando...
                  </Text>
                </Animated.View>
              )}

              {/* Pin */}
              <Pressable onPress={handleTogglePin} hitSlop={10}>
                <Ionicons
                  name={note?.is_pinned ? "pin" : "pin-outline"}
                  size={22}
                  color={
                    note?.is_pinned
                      ? theme.colors.primary
                      : theme.colors.onSurfaceVariant
                  }
                />
              </Pressable>

              {/* Delete */}
              {canDelete && (
                <Pressable
                  onPress={() => setShowDeleteDialog(true)}
                  hitSlop={10}
                >
                  <Ionicons
                    name="trash-outline"
                    size={22}
                    color={theme.colors.error}
                  />
                </Pressable>
              )}
            </View>
          }
        />

        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          keyboardVerticalOffset={0}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.editorContent,
              { paddingBottom: 100 + insets.bottom },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ─── Title ─── */}
            <Animated.View entering={FadeInUp.duration(400)}>
              <TextInput
                style={[styles.titleInput, { color: theme.colors.onSurface }]}
                placeholder="Título de la nota"
                placeholderTextColor={theme.colors.outline}
                value={title}
                onChangeText={handleTitleChange}
                multiline
                maxLength={200}
              />
            </Animated.View>

            {/* ─── Divider ─── */}
            <View
              style={[
                styles.titleDivider,
                { backgroundColor: theme.colors.outlineVariant },
              ]}
            />

            {/* ─── Blocks ─── */}
            {blocks.map((block, index) => (
              <Animated.View
                key={block.id}
                entering={FadeInDown.duration(300).delay(index * 40)}
              >
                {block.type === "checklist" ? (
                  <SquircleView
                    style={[
                      styles.checklistContainer,
                      {
                        backgroundColor: theme.colors.surfaceVariant,
                        borderColor: theme.colors.outlineVariant,
                        borderWidth: 1,
                      },
                    ]}
                    cornerSmoothing={1}
                  >
                    <ChecklistBlockEditor
                      block={block}
                      onUpdateItems={(items) =>
                        updateBlock(block.id, { items })
                      }
                      onRemove={() => removeBlock(block.id)}
                    />
                  </SquircleView>
                ) : (
                  <TextBlockEditor
                    block={block}
                    onChangeValue={(value) =>
                      updateBlock(block.id, { value })
                    }
                    onRemove={() => removeBlock(block.id)}
                    autoFocus={block.id === lastFocusedBlockId}
                  />
                )}
              </Animated.View>
            ))}

            {/* ─── Empty hint ─── */}
            {blocks.length === 0 && (
              <Animated.View
                entering={FadeIn.duration(400).delay(200)}
                style={styles.emptyHint}
              >
                <Text
                  style={[
                    styles.emptyHintText,
                    { color: theme.colors.outline },
                  ]}
                >
                  Usa la barra inferior para añadir contenido
                </Text>
              </Animated.View>
            )}
          </ScrollView>

          {/* ─── Toolbar ─── */}
          <Animated.View
            entering={FadeInDown.duration(300).delay(200)}
            style={[
              styles.toolbar,
              {
                backgroundColor: theme.colors.surface,
                borderTopColor: theme.colors.outlineVariant,
                paddingBottom: Math.max(insets.bottom, 12),
              },
            ]}
          >
            <ToolbarButton
              icon="text-outline"
              label="Texto"
              onPress={() => addBlock("text")}
            />
            <ToolbarButton
              icon="text"
              label="Título"
              onPress={() => addBlock("heading")}
            />
            <ToolbarButton
              icon="checkbox-outline"
              label="Lista"
              onPress={() => addBlock("checklist")}
            />
          </Animated.View>
        </KeyboardAvoidingView>
      </View>

      {/* Delete confirmation */}
      <ConfirmDialog
        visible={showDeleteDialog}
        title="Eliminar nota"
        message="¿Eliminar esta nota? Esta acción no se puede deshacer."
        type="error"
        confirmText="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
        showCancel={true}
      />
    </>
  );
}

// ─── Toolbar Button ─────────────────────────────────────────────────────
const ToolbarButton = React.memo(
  ({
    icon,
    label,
    onPress,
  }: {
    icon: string;
    label: string;
    onPress: () => void;
  }) => {
    const theme = useTheme();
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.toolbarBtn,
          {
            backgroundColor: pressed
              ? theme.colors.surfaceVariant
              : "transparent",
          },
        ]}
      >
        <Ionicons
          name={icon as any}
          size={20}
          color={theme.colors.onSurfaceVariant}
        />
        <Text
          style={[
            styles.toolbarLabel,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          {label}
        </Text>
      </Pressable>
    );
  }
);
ToolbarButton.displayName = "ToolbarButton";

// ─── Styles ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  scrollView: { flex: 1 },
  editorContent: { paddingHorizontal: 24, paddingTop: 4 },

  // Loading
  loadingContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    gap: 16,
  },
  skeletonBlock: {
    height: 60,
    borderRadius: 16,
  },

  // Header
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  savingText: {
    fontFamily: "Archivo-Medium",
    fontSize: 12,
    letterSpacing: 0.2,
  },

  // Title
  titleInput: {
    fontFamily: "InstrumentSerif-Italic",
    fontSize: 32,
    lineHeight: 38,
    paddingVertical: 8,
    minHeight: 48,
  },
  titleDivider: {
    height: 1,
    marginTop: 8,
    marginBottom: 20,
  },

  // Blocks common
  blockContainer: {
    marginBottom: 16,
    position: "relative",
  },
  blockRemoveBtn: {
    position: "absolute",
    top: 4,
    right: 0,
    padding: 4,
  },

  // Text block
  textInput: {
    fontFamily: "Archivo-Medium",
    fontSize: 15,
    lineHeight: 22,
    paddingRight: 28,
    minHeight: 36,
  },

  // Heading block
  headingInput: {
    fontFamily: "Archivo-Bold",
    fontSize: 20,
    lineHeight: 26,
    paddingRight: 28,
    minHeight: 36,
  },

  // Checklist block
  checklistContainer: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 16,
  },
  checklistHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  checklistTitle: {
    fontFamily: "Archivo-Bold",
    fontSize: 14,
    letterSpacing: 0.3,
  },
  checklistItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 5,
    gap: 10,
  },
  checkbox: {
    justifyContent: "center",
    alignItems: "center",
  },
  checklistItemInput: {
    flex: 1,
    fontFamily: "Archivo-Medium",
    fontSize: 14,
    lineHeight: 20,
    paddingVertical: 2,
  },
  checklistRemoveBtn: {
    padding: 2,
  },
  checklistAddRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 6,
    marginTop: 4,
  },
  checklistAddInput: {
    flex: 1,
    fontFamily: "Archivo-Medium",
    fontSize: 14,
    paddingVertical: 2,
  },

  // Empty hint
  emptyHint: {
    alignItems: "center",
    paddingTop: 60,
  },
  emptyHintText: {
    fontFamily: "Archivo-Medium",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },

  // Toolbar
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  toolbarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  toolbarLabel: {
    fontFamily: "Archivo-Medium",
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
