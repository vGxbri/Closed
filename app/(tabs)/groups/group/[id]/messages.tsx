/**
 * Chat del grupo
 * Mensajes en tiempo real entre miembros del grupo.
 */
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import { Stack, useGlobalSearchParams } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import SquircleView from "react-native-fast-squircle";
import { Text, useTheme } from "react-native-paper";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { MessageBubble } from "@/components/chat/MessageBubble";
import { BottomSheetModal } from "@/components/ui/BottomSheetModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useAuth, useGroup } from "@/hooks";
import {
  enrichMessagesWithReplies,
  mergeReplyContextFrom,
} from "@/lib/messageReplies";
import { messagesService } from "@/services";
import { MessageView } from "@/types/database";

const FLOATING_TAB_BAR_HEIGHT = 64;
const FLOATING_TAB_BAR_EXTRA_MARGIN = 16;

const formatDateSeparator = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = today.getTime() - msgDate.getTime();
  const dayMs = 86400000;
  if (diff < dayMs) return "Hoy";
  if (diff < dayMs * 2) return "Ayer";
  if (diff < dayMs * 7) {
    return [
      "Domingo",
      "Lunes",
      "Martes",
      "Miércoles",
      "Jueves",
      "Viernes",
      "Sábado",
    ][date.getDay()];
  }
  return date.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const isSameDay = (a: string, b: string): boolean => {
  const da = new Date(a),
    db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
};

const DateSeparator = React.memo(({ dateStr }: { dateStr: string }) => {
  const theme = useTheme();
  return (
    <View style={styles.dateSeparator}>
      <View
        style={[
          styles.dateLine,
          { backgroundColor: theme.colors.outlineVariant },
        ]}
      />
      <SquircleView
        style={[
          styles.dateBadge,
          { backgroundColor: theme.colors.surfaceVariant },
        ]}
        cornerSmoothing={1}
      >
        <Text
          style={[styles.dateText, { color: theme.colors.onSurfaceVariant }]}
        >
          {formatDateSeparator(dateStr)}
        </Text>
      </SquircleView>
      <View
        style={[
          styles.dateLine,
          { backgroundColor: theme.colors.outlineVariant },
        ]}
      />
    </View>
  );
});
DateSeparator.displayName = "DateSeparator";

const MessageSkeleton = React.memo(({ index }: { index: number }) => {
  const theme = useTheme();
  const isMine = index % 3 === 0;
  const width = [180, 220, 140, 260, 160][index % 5];
  return (
    <Animated.View
      entering={FadeIn.duration(400).delay(index * 60)}
      style={[styles.skRow, isMine ? styles.skMine : styles.skTheirs]}
    >
      {!isMine && (
        <View
          style={[
            styles.skAvatar,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        />
      )}
      <SquircleView
        style={[
          styles.skBubble,
          { backgroundColor: theme.colors.surfaceVariant, width },
        ]}
        cornerSmoothing={1}
      />
    </Animated.View>
  );
});
MessageSkeleton.displayName = "MessageSkeleton";

export default function MessagesScreen() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const { user, profile } = useAuth();
  const { group, isAdmin } = useGroup(id as string);

  const myMember = useMemo(
    () => group?.members.find((m) => m.user_id === user?.id) ?? null,
    [group?.members, user?.id],
  );
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<MessageView[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  const [replyTo, setReplyTo] = useState<MessageView | null>(null);
  const [editingMessage, setEditingMessage] = useState<MessageView | null>(
    null,
  );

  const [contextMessage, setContextMessage] = useState<MessageView | null>(
    null,
  );

  const [deleteTarget, setDeleteTarget] = useState<MessageView | null>(null);

  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const bottomMargin = insets.bottom > 0 ? insets.bottom + 12 : 36;
  const maxPadding =
    bottomMargin + FLOATING_TAB_BAR_HEIGHT + FLOATING_TAB_BAR_EXTRA_MARGIN;
  const keyboard = useAnimatedKeyboard();

  const animatedKeyboardStyle = useAnimatedStyle(() => ({
    paddingBottom: Math.max(maxPadding, keyboard.height.value + 8),
  }));

  const sendScale = useSharedValue(1);
  const hasText = inputText.trim().length > 0;
  const sendAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendScale.value }],
  }));

  const topGradientHeight = insets.top + 72;

  const displayMessages = useMemo(
    () => enrichMessagesWithReplies(messages),
    [messages],
  );

  useEffect(() => {
    if (!id) {
      setIsLoading(false);
      return;
    }
    let mounted = true;

    const load = async () => {
      try {
        const data = await messagesService.getMessages(id as string);
        if (mounted) setMessages(data);
      } catch {
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    load();

    const msgSub = messagesService.subscribeToMessages(id as string, {
      onNewMessage: (msg) => {
        if (!mounted) return;
        setMessages((prev) => {
          const optimistic = prev.find(
            (m) =>
              m.id.startsWith("optimistic-") &&
              m.sender_id === msg.sender_id &&
              m.content === msg.content,
          );
          const merged = mergeReplyContextFrom(msg, optimistic);
          const withoutOpt = prev.filter((m) => m.id !== optimistic?.id);
          if (withoutOpt.some((m) => m.id === merged.id)) return withoutOpt;
          return enrichMessagesWithReplies([merged, ...withoutOpt]);
        });
      },
      onMessageUpdated: (msg) => {
        if (!mounted) return;
        setMessages((prev) =>
          enrichMessagesWithReplies(
            prev.map((m) =>
              m.id === msg.id ? mergeReplyContextFrom(msg, m) : m,
            ),
          ),
        );
      },
      onMessageDeleted: () => {},
    });

    return () => {
      mounted = false;
      msgSub.unsubscribe();
    };
  }, [id]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || isSending || !id || !user) return;
    const text = inputText.trim();

    if (editingMessage) {
      try {
        setIsSending(true);
        await messagesService.editMessage(editingMessage.id, text);
        setEditingMessage(null);
        setInputText("");
      } catch {
      } finally {
        setIsSending(false);
      }
      return;
    }

    setInputText("");
    setIsSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    sendScale.value = withSpring(0.8, { damping: 15 }, () => {
      sendScale.value = withSpring(1, { damping: 10 });
    });

    const replyingTo = replyTo;
    const replyToId =
      replyingTo?.id && !replyingTo.id.startsWith("optimistic-")
        ? replyingTo.id
        : undefined;
    const optimisticId = `optimistic-${Date.now()}`;
    const parentPreview = replyingTo
      ? replyingTo.is_deleted
        ? "Mensaje eliminado"
        : replyingTo.content?.trim()?.slice(0, 100) || null
      : null;

    const optimisticMsg: MessageView = {
      id: optimisticId,
      group_id: id as string,
      sender_id: user.id,
      content: text,
      type: "text",
      metadata: null,
      is_edited: false,
      is_deleted: false,
      reply_to_id: replyToId ?? null,
      created_at: new Date().toISOString(),
      sender_name: myMember?.display_name || profile?.display_name || "Tú",
      sender_avatar: myMember?.avatar_url ?? profile?.avatar_url ?? null,
      reply_to_content: parentPreview,
      reply_to_sender_name: replyingTo?.sender_name || null,
    };

    setMessages((prev) => enrichMessagesWithReplies([optimisticMsg, ...prev]));
    setReplyTo(null);

    try {
      const sent = await messagesService.sendMessage(
        id as string,
        text,
        "text",
        replyToId,
      );
      const full = await messagesService.refreshMessage(sent.id, id as string);
      if (full) {
        setMessages((prev) => {
          const withoutOpt = prev.filter((m) => m.id !== optimisticId);
          const merged = mergeReplyContextFrom(full, optimisticMsg);
          if (withoutOpt.some((m) => m.id === merged.id)) {
            return enrichMessagesWithReplies(
              withoutOpt.map((m) => (m.id === merged.id ? merged : m)),
            );
          }
          return enrichMessagesWithReplies([merged, ...withoutOpt]);
        });
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setInputText(text);
      if (replyingTo) setReplyTo(replyingTo);
    } finally {
      setIsSending(false);
    }
  }, [
    inputText,
    isSending,
    id,
    user,
    profile,
    myMember,
    editingMessage,
    replyTo,
    sendScale,
  ]);

  const handleReply = useCallback((msg: MessageView) => {
    setReplyTo(msg);
    setEditingMessage(null);
    setContextMessage(null);
    inputRef.current?.focus();
  }, []);

  const handleStartEdit = useCallback((msg: MessageView) => {
    setEditingMessage(msg);
    setInputText(msg.content);
    setReplyTo(null);
    setContextMessage(null);
    inputRef.current?.focus();
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await messagesService.deleteMessage(deleteTarget.id, isAdmin);
    } catch {}
    setDeleteTarget(null);
  }, [deleteTarget, isAdmin]);

  const handleLongPress = useCallback((msg: MessageView) => {
    setContextMessage(msg);
  }, []);

  const handleCancelReply = useCallback(() => {
    setReplyTo(null);
  }, []);
  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null);
    setInputText("");
  }, []);

  const renderItem = useCallback(
    ({ item, index }: { item: MessageView; index: number }) => {
      const isMine = item.sender_id === user?.id;
      const prevMsg = displayMessages[index + 1];
      const nextMsg = displayMessages[index - 1];
      const isLastInGroup = !nextMsg || nextMsg.sender_id !== item.sender_id;
      const isFirstInGroup = !prevMsg || prevMsg.sender_id !== item.sender_id;

      // Separador de fecha: en lista invertida, el anterior es más antiguo
      const showDate =
        !prevMsg || !isSameDay(item.created_at, prevMsg.created_at);

      return (
        <>
          <MessageBubble
            message={item}
            isMine={isMine}
            showAvatar={!isMine && isLastInGroup}
            showName={!isMine && isFirstInGroup}
            onReply={handleReply}
            onLongPress={handleLongPress}
          />
          {showDate && <DateSeparator dateStr={item.created_at} />}
        </>
      );
    },
    [user?.id, displayMessages, handleReply, handleLongPress],
  );

  const keyExtractor = useCallback((item: MessageView) => item.id, []);

  const EmptyComponent = useMemo(() => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <SquircleView
          style={[
            styles.emptyIconBg,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
          cornerSmoothing={1}
        >
          <Ionicons
            name="chatbubbles-outline"
            size={36}
            color={theme.colors.primary}
          />
        </SquircleView>
        <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
          Sin mensajes aún
        </Text>
        <Text
          style={[
            styles.emptySubtitle,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          ¡Escribe algo para empezar la conversación!
        </Text>
      </View>
    );
  }, [isLoading, theme]);

  const SkeletonList = useMemo(
    () => (
      <View style={styles.skeletonContainer}>
        {Array.from({ length: 8 }).map((_, i) => (
          <MessageSkeleton key={i} index={i} />
        ))}
      </View>
    ),
    [],
  );

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <Animated.View style={[styles.keyboardView, animatedKeyboardStyle]}>
        <View style={styles.listArea}>
          {isLoading ? (
            SkeletonList
          ) : (
            <FlatList
              ref={flatListRef}
              data={displayMessages}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              inverted
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: topGradientHeight },
              ]}
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={EmptyComponent}
              maxToRenderPerBatch={15}
              windowSize={10}
              removeClippedSubviews={Platform.OS === "android"}
            />
          )}

          <View
            style={[styles.topFade, { height: topGradientHeight }]}
            pointerEvents="none"
          >
            <Svg width="100%" height="100%">
              <Defs>
                <LinearGradient
                  id="messagesTopFade"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <Stop
                    offset="0"
                    stopColor={theme.colors.background}
                    stopOpacity="1"
                  />
                  <Stop
                    offset="0.45"
                    stopColor={theme.colors.background}
                    stopOpacity="0.75"
                  />
                  <Stop
                    offset="1"
                    stopColor={theme.colors.background}
                    stopOpacity="0"
                  />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#messagesTopFade)" />
            </Svg>
          </View>
        </View>

        {(replyTo || editingMessage) && (
          <Animated.View
            entering={FadeInDown.duration(200)}
            exiting={FadeOut.duration(150)}
            style={[
              styles.previewBar,
              {
                backgroundColor: theme.colors.surface,
                borderTopColor: theme.colors.outlineVariant,
              },
            ]}
          >
            <View
              style={[
                styles.previewAccent,
                {
                  backgroundColor: editingMessage
                    ? theme.colors.tertiary
                    : theme.colors.primary,
                },
              ]}
            />
            <Ionicons
              name={editingMessage ? "pencil" : "arrow-undo"}
              size={16}
              color={
                editingMessage ? theme.colors.tertiary : theme.colors.primary
              }
              style={{ marginRight: 8 }}
            />
            <View style={styles.previewContent}>
              <Text
                style={[
                  styles.previewLabel,
                  {
                    color: editingMessage
                      ? theme.colors.tertiary
                      : theme.colors.primary,
                  },
                ]}
              >
                {editingMessage ? "Editando" : replyTo?.sender_name}
              </Text>
              <Text
                style={[
                  styles.previewText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
                numberOfLines={1}
              >
                {editingMessage ? editingMessage.content : replyTo?.content}
              </Text>
            </View>
            <Pressable
              onPress={editingMessage ? handleCancelEdit : handleCancelReply}
              hitSlop={12}
              style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1 })}
            >
              <Ionicons
                name="close-circle"
                size={22}
                color={theme.colors.outline}
              />
            </Pressable>
          </Animated.View>
        )}

        <View
          style={[
            styles.inputContainer,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <View style={styles.inputRow}>
            <SquircleView
              style={[
                styles.inputWrapper,
                { backgroundColor: theme.colors.surfaceVariant },
              ]}
              cornerSmoothing={1}
            >
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: theme.colors.onSurface }]}
                placeholder="Mensaje..."
                placeholderTextColor={theme.colors.outline}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={2000}
                textAlignVertical="center"
              />
            </SquircleView>

            <Animated.View style={sendAnimatedStyle}>
              <Pressable
                onPress={handleSend}
                disabled={!hasText || isSending}
                style={({ pressed }) => [
                  styles.sendButton,
                  {
                    backgroundColor: hasText
                      ? theme.colors.primary
                      : theme.colors.surfaceVariant,
                    opacity: pressed ? 0.85 : 1,
                    transform: [{ scale: pressed ? 0.92 : 1 }],
                  },
                ]}
              >
                <Ionicons
                  name={editingMessage ? "checkmark" : "arrow-up"}
                  size={20}
                  color={
                    hasText ? theme.colors.onPrimary : theme.colors.outline
                  }
                />
              </Pressable>
            </Animated.View>
          </View>
        </View>
      </Animated.View>

      <BottomSheetModal
        visible={!!contextMessage}
        onDismiss={() => setContextMessage(null)}
        contentStyle={styles.contextSheet}
      >
        {contextMessage && (
          <View>
            <View
              style={{ marginBottom: 20, paddingHorizontal: 4 }}
              pointerEvents="none"
            >
              <MessageBubble
                message={contextMessage}
                isMine={contextMessage.sender_id === user?.id}
                showAvatar={contextMessage.sender_id !== user?.id}
                showName={contextMessage.sender_id !== user?.id}
                onReply={() => {}}
                onLongPress={() => {}}
              />
            </View>

            <ContextAction
              icon="arrow-undo-outline"
              label="Responder"
              onPress={() => {
                handleReply(contextMessage);
              }}
            />
            <ContextAction
              icon="copy-outline"
              label="Copiar"
              onPress={() => {
                Clipboard.setStringAsync(contextMessage.content);
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Success,
                );
                setContextMessage(null);
              }}
            />
            {messagesService.canEdit(contextMessage, user?.id || "") && (
              <ContextAction
                icon="pencil-outline"
                label="Editar"
                onPress={() => {
                  handleStartEdit(contextMessage);
                }}
              />
            )}
            {(contextMessage.sender_id === user?.id || isAdmin) &&
              !contextMessage.is_deleted && (
                <ContextAction
                  icon="trash-outline"
                  label="Eliminar"
                  destructive
                  onPress={() => {
                    setDeleteTarget(contextMessage);
                    setContextMessage(null);
                  }}
                />
              )}
          </View>
        )}
      </BottomSheetModal>

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Eliminar mensaje"
        message="El mensaje será eliminado para todos los miembros del grupo."
        type="error"
        confirmText="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        showCancel={true}
      />
    </View>
  );
}

const ContextAction = React.memo(
  ({
    icon,
    label,
    onPress,
    destructive,
  }: {
    icon: string;
    label: string;
    onPress: () => void;
    destructive?: boolean;
  }) => {
    const theme = useTheme();
    const color = destructive ? theme.colors.error : theme.colors.onSurface;
    return (
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.contextAction,
          { opacity: pressed ? 0.7 : 1 },
        ]}
      >
        <Ionicons name={icon as any} size={20} color={color} />
        <Text style={[styles.contextActionLabel, { color }]}>{label}</Text>
      </Pressable>
    );
  },
);
ContextAction.displayName = "ContextAction";

const styles = StyleSheet.create({
  container: { flex: 1 },
  keyboardView: { flex: 1 },
  headerSeparator: { height: StyleSheet.hairlineWidth, width: "100%" },

  listArea: { flex: 1 },
  topFade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    flexGrow: 1,
  },

  dateSeparator: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 16,
    paddingHorizontal: 8,
  },
  dateLine: { flex: 1, height: StyleSheet.hairlineWidth },
  dateBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    marginHorizontal: 10,
  },
  dateText: { fontFamily: "Archivo-Medium", fontSize: 11, letterSpacing: 0.3 },

  previewBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  previewAccent: {
    width: 3,
    height: "100%",
    borderRadius: 2,
    marginRight: 4,
    minHeight: 30,
  },
  previewContent: { flex: 1, marginRight: 10 },
  previewLabel: { fontFamily: "Archivo-Bold", fontSize: 12 },
  previewText: { fontFamily: "Archivo-Medium", fontSize: 13, marginTop: 1 },

  inputContainer: { paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    minHeight: 44,
  },
  input: {
    flex: 1,
    fontFamily: "Archivo-Medium",
    fontSize: 15,
    lineHeight: 20,
    maxHeight: 120,
    paddingTop: Platform.OS === "ios" ? 4 : 2,
    paddingBottom: Platform.OS === "ios" ? 4 : 2,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },

  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  emptyTitle: { fontFamily: "Archivo-Bold", fontSize: 17, marginBottom: 6 },
  emptySubtitle: {
    fontFamily: "Archivo-Medium",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 32,
  },

  skeletonContainer: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    flexDirection: "column-reverse",
    justifyContent: "flex-start",
  },
  skRow: { flexDirection: "row", marginVertical: 4 },
  skMine: { justifyContent: "flex-end" },
  skTheirs: { justifyContent: "flex-start" },
  skAvatar: { width: 32, height: 32, borderRadius: 16, marginRight: 8 },
  skBubble: { height: 36, borderRadius: 18 },

  contextSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },

  contextDivider: { height: StyleSheet.hairlineWidth, marginVertical: 12 },
  contextAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  contextActionLabel: { fontFamily: "Archivo-Medium", fontSize: 16 },
});
