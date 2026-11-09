/**
 * Chat del grupo
 * Mensajes en tiempo real entre miembros del grupo.
 */
import { Ionicons } from "@expo/vector-icons";
import { BlurTargetView } from "expo-blur";
import * as Clipboard from "expo-clipboard";
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
} from "expo-glass-effect";
import * as Haptics from "expo-haptics";
import { useGlobalSearchParams, useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
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
  useAnimatedKeyboard,
  useAnimatedStyle,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ChatComposer, ComposerContext } from "@/components/chat/ChatComposer";
import {
  formatMessageTime,
  MessageBubble,
} from "@/components/chat/MessageBubble";
import { MemberListBottomSheet } from "@/components/MemberListBottomSheet";
import { CircleButton } from "@/components/ui/CircleButton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { FloatingTopBar, TOP_BAR_HEIGHT } from "@/components/ui/FloatingTopBar";
import { MenuOption, OptionsMenu } from "@/components/ui/OptionsMenu";
import { useSnackbar } from "@/components/ui/SnackbarContext";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useAuth, useGroup } from "@/hooks";
import {
  enrichMessagesWithReplies,
  mergeReplyContextFrom,
} from "@/lib/messageReplies";
import { messagesService } from "@/services";
import { MessageView } from "@/types/database";

// Liquid Glass solo existe en iOS 26+; en el resto los controles son superficies opacas.
const glassAvailable = isLiquidGlassAvailable() && isGlassEffectAPIAvailable();

const FLOATING_TAB_BAR_HEIGHT = 64;
const FLOATING_TAB_BAR_EXTRA_MARGIN = 16;

const PAGE_SIZE = 50;
// Mensajes seguidos del mismo autor se agrupan si no pasan más de estos minutos entre ellos
const GROUP_GAP_MS = 5 * 60 * 1000;
// A partir de este desplazamiento aparece el botón para volver al último mensaje
const JUMP_BUTTON_OFFSET = 320;

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

const inSameGroup = (a: MessageView, b: MessageView | undefined): boolean =>
  !!b &&
  a.sender_id === b.sender_id &&
  isSameDay(a.created_at, b.created_at) &&
  Math.abs(
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  ) < GROUP_GAP_MS;

const DateSeparator = React.memo(({ dateStr }: { dateStr: string }) => {
  const theme = useTheme();
  return (
    <View style={styles.dateSeparator}>
      <View
        style={[
          styles.dateBadge,
          {
            backgroundColor: theme.dark
              ? "rgba(255,255,255,0.08)"
              : "rgba(0,0,0,0.05)",
          },
        ]}
      >
        <Text
          accessibilityRole="header"
          style={[styles.dateText, { color: theme.colors.onSurfaceVariant }]}
        >
          {formatDateSeparator(dateStr)}
        </Text>
      </View>
    </View>
  );
});
DateSeparator.displayName = "DateSeparator";

const MessageSkeleton = React.memo(({ index }: { index: number }) => {
  const theme = useTheme();
  const isMine = index % 3 === 0;
  const width = [180, 220, 140, 260, 160][index % 5];
  return (
    <View style={[styles.skRow, isMine ? styles.skMine : styles.skTheirs]}>
      {!isMine && (
        <View
          style={[
            styles.skAvatar,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        />
      )}
      <View
        style={[
          styles.skBubble,
          { backgroundColor: theme.colors.surfaceVariant, width },
        ]}
      />
    </View>
  );
});
MessageSkeleton.displayName = "MessageSkeleton";

interface ChatTitleProps {
  name: string;
  coverUri: string | null | undefined;
  memberCount: number;
  onPress: () => void;
}

// Cápsula con el grupo en la barra superior; abre la lista de miembros
function ChatTitle({ name, coverUri, memberCount, onPress }: ChatTitleProps) {
  const theme = useTheme();
  const members = memberCount === 1 ? "1 miembro" : `${memberCount} miembros`;

  const content = (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${members}`}
      accessibilityHint="Muestra los miembros del grupo"
      style={styles.titleContent}
    >
      <UserAvatar uri={coverUri} name={name} size={32} borderRadius={16} />
      <View style={styles.titleText}>
        <Text
          style={[styles.titleName, { color: theme.colors.onSurface }]}
          numberOfLines={1}
        >
          {name}
        </Text>
        <Text
          style={[styles.titleMeta, { color: theme.colors.onSurfaceVariant }]}
          numberOfLines={1}
        >
          {members}
        </Text>
      </View>
    </Pressable>
  );

  if (glassAvailable) {
    return (
      <GlassView style={styles.title} isInteractive>
        {content}
      </GlassView>
    );
  }

  return (
    <View
      style={[
        styles.title,
        styles.titleSolid,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.outlineVariant,
        },
      ]}
    >
      {content}
    </View>
  );
}

export default function MessagesScreen() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user, profile } = useAuth();
  const { group, isAdmin } = useGroup(id as string);
  const { showSnackbar } = useSnackbar();

  const myMember = useMemo(
    () => group?.members.find((m) => m.user_id === user?.id) ?? null,
    [group?.members, user?.id],
  );
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<MessageView[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const loadingMoreRef = useRef(false);

  const [replyTo, setReplyTo] = useState<MessageView | null>(null);
  const [editingMessage, setEditingMessage] = useState<MessageView | null>(
    null,
  );

  // El mensaje del menú se conserva mientras la hoja se cierra, para que no se vacíe a media animación
  const [menuMessage, setMenuMessage] = useState<MessageView | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<MessageView | null>(null);
  const [showMembers, setShowMembers] = useState(false);

  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [showJump, setShowJump] = useState(false);
  const [composerHeight, setComposerHeight] = useState(50);

  const flatListRef = useRef<FlatList<MessageView>>(null);
  const inputRef = useRef<TextInput>(null);
  const backgroundRef = useRef(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bottomMargin = insets.bottom > 0 ? insets.bottom + 12 : 36;
  // En iOS la barra nativa ya forma parte del área segura inferior.
  const maxPadding =
    Platform.OS === "ios"
      ? insets.bottom + 8
      : bottomMargin + FLOATING_TAB_BAR_HEIGHT + FLOATING_TAB_BAR_EXTRA_MARGIN;
  const keyboard = useAnimatedKeyboard();

  const animatedKeyboardStyle = useAnimatedStyle(() => ({
    paddingBottom: Math.max(maxPadding, keyboard.height.value + 8),
  }));

  const topInset = insets.top + TOP_BAR_HEIGHT;

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
        const data = await messagesService.getMessages(id as string, PAGE_SIZE);
        if (mounted) {
          setMessages(data);
          setHasMore(data.length === PAGE_SIZE);
        }
      } catch {
        if (mounted) {
          showSnackbar("No se pudieron cargar los mensajes", "error");
        }
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
  }, [id, showSnackbar]);

  useEffect(
    () => () => {
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
    },
    [],
  );

  // Mensajes más antiguos al llegar arriba del todo
  const loadOlder = useCallback(async () => {
    if (!id || !hasMore || loadingMoreRef.current) return;
    const loaded = messages.filter(
      (m) => !m.id.startsWith("optimistic-"),
    ).length;
    if (loaded === 0) return;

    loadingMoreRef.current = true;
    setIsLoadingMore(true);
    try {
      const older = await messagesService.getMessages(
        id as string,
        PAGE_SIZE,
        loaded,
      );
      setHasMore(older.length === PAGE_SIZE);
      setMessages((prev) => {
        const known = new Set(prev.map((m) => m.id));
        return enrichMessagesWithReplies([
          ...prev,
          ...older.filter((m) => !known.has(m.id)),
        ]);
      });
    } catch {
      showSnackbar("No se pudieron cargar más mensajes", "error");
    } finally {
      loadingMoreRef.current = false;
      setIsLoadingMore(false);
    }
  }, [id, hasMore, messages, showSnackbar]);

  const handleCancelEdit = useCallback(() => {
    setEditingMessage(null);
    setInputText("");
  }, []);

  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || !id || !user) return;

    if (editingMessage) {
      if (text === editingMessage.content.trim()) {
        handleCancelEdit();
        return;
      }
      try {
        setIsSavingEdit(true);
        await messagesService.editMessage(editingMessage.id, text);
        setEditingMessage(null);
        setInputText("");
      } catch {
        showSnackbar("No se pudo editar el mensaje", "error");
      } finally {
        setIsSavingEdit(false);
      }
      return;
    }

    setInputText("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

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
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });

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
      // El texto vuelve al campo para poder reintentarlo
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setInputText(text);
      if (replyingTo) setReplyTo(replyingTo);
      showSnackbar("No se pudo enviar el mensaje", "error");
    }
  }, [
    inputText,
    id,
    user,
    profile,
    myMember,
    editingMessage,
    replyTo,
    handleCancelEdit,
    showSnackbar,
  ]);

  const handleReply = useCallback((msg: MessageView) => {
    setReplyTo(msg);
    setEditingMessage(null);
    inputRef.current?.focus();
  }, []);

  const handleStartEdit = useCallback((msg: MessageView) => {
    setEditingMessage(msg);
    setInputText(msg.content);
    setReplyTo(null);
    inputRef.current?.focus();
  }, []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await messagesService.deleteMessage(deleteTarget.id, isAdmin);
    } catch {
      showSnackbar("No se pudo eliminar el mensaje", "error");
    }
    setDeleteTarget(null);
  }, [deleteTarget, isAdmin, showSnackbar]);

  const handleLongPress = useCallback((msg: MessageView) => {
    setMenuMessage(msg);
    setMenuVisible(true);
  }, []);

  const handleCancelContext = useCallback(() => {
    if (editingMessage) handleCancelEdit();
    else setReplyTo(null);
  }, [editingMessage, handleCancelEdit]);

  // Desde la cita de una respuesta se salta al mensaje original y se destaca un momento
  const handlePressQuote = useCallback(
    (msg: MessageView) => {
      const index = displayMessages.findIndex((m) => m.id === msg.reply_to_id);
      if (index < 0) {
        showSnackbar("El mensaje original es más antiguo", "info");
        return;
      }
      flatListRef.current?.scrollToIndex({
        index,
        viewPosition: 0.5,
        animated: true,
      });
      setHighlightedId(null);
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
      highlightTimer.current = setTimeout(() => {
        setHighlightedId(msg.reply_to_id);
        highlightTimer.current = setTimeout(() => setHighlightedId(null), 1200);
      }, 350);
    },
    [displayMessages, showSnackbar],
  );

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const far = e.nativeEvent.contentOffset.y > JUMP_BUTTON_OFFSET;
      setShowJump((prev) => (prev === far ? prev : far));
    },
    [],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: MessageView; index: number }) => {
      // En lista invertida, el siguiente índice es el mensaje anterior en el tiempo
      const olderMsg = displayMessages[index + 1];
      const newerMsg = displayMessages[index - 1];

      const showDate =
        !olderMsg || !isSameDay(item.created_at, olderMsg.created_at);

      return (
        <>
          <MessageBubble
            message={item}
            isMine={item.sender_id === user?.id}
            isFirstInGroup={!inSameGroup(item, olderMsg)}
            isLastInGroup={!inSameGroup(item, newerMsg)}
            highlighted={item.id === highlightedId}
            onReply={handleReply}
            onLongPress={handleLongPress}
            onPressQuote={handlePressQuote}
          />
          {showDate && <DateSeparator dateStr={item.created_at} />}
        </>
      );
    },
    [
      user?.id,
      displayMessages,
      highlightedId,
      handleReply,
      handleLongPress,
      handlePressQuote,
    ],
  );

  const keyExtractor = useCallback((item: MessageView) => item.id, []);

  const composerContext: ComposerContext | null = editingMessage
    ? { kind: "edit", text: editingMessage.content }
    : replyTo
      ? {
          kind: "reply",
          name: replyTo.sender_id === user?.id ? "ti" : replyTo.sender_name,
          text: replyTo.is_deleted ? "Mensaje eliminado" : replyTo.content,
        }
      : null;

  const menuIsMine = menuMessage?.sender_id === user?.id;
  const menuOptions: MenuOption[] = menuMessage
    ? [
        {
          label: "Responder",
          icon: "arrow-undo-outline",
          action: () => handleReply(menuMessage),
        },
        {
          label: "Copiar",
          icon: "copy-outline",
          action: () => {
            Clipboard.setStringAsync(menuMessage.content);
            showSnackbar("Mensaje copiado", "success");
          },
        },
        ...(messagesService.canEdit(menuMessage, user?.id || "")
          ? [
              {
                label: "Editar",
                icon: "pencil-outline" as const,
                action: () => handleStartEdit(menuMessage),
              },
            ]
          : []),
        ...(menuIsMine || isAdmin
          ? [
              {
                label: "Eliminar",
                icon: "trash-outline" as const,
                isDestructive: true,
                action: () => setDeleteTarget(menuMessage),
              },
            ]
          : []),
      ]
    : [];

  const neutralFill = theme.dark
    ? "rgba(255,255,255,0.08)"
    : "rgba(0,0,0,0.05)";

  return (
    <>
      <BlurTargetView
        ref={backgroundRef}
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <Animated.View style={[styles.container, animatedKeyboardStyle]}>
          {/* Los elementos flotantes se colocan respecto a esta vista: una posición absoluta
              ignora el relleno de su padre y acabarían bajo la barra de pestañas */}
          <View style={styles.container}>
            {isLoading ? (
              <Animated.View
                entering={FadeIn.duration(300)}
                style={[
                  styles.skeletonContainer,
                  { paddingBottom: composerHeight + 12 },
                ]}
                accessibilityLabel="Cargando mensajes"
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <MessageSkeleton key={i} index={i} />
                ))}
              </Animated.View>
            ) : displayMessages.length === 0 ? (
              <View
                style={[
                  styles.emptyContainer,
                  { paddingTop: topInset, paddingBottom: composerHeight },
                ]}
              >
                <SquircleView
                  style={[
                    styles.emptyIconBg,
                    { backgroundColor: `${theme.colors.primary}1F` },
                  ]}
                  cornerSmoothing={1}
                >
                  <Ionicons
                    name="chatbubbles"
                    size={34}
                    color={theme.colors.primary}
                  />
                </SquircleView>
                <Text
                  style={[styles.emptyTitle, { color: theme.colors.onSurface }]}
                >
                  Aún no hay mensajes
                </Text>
                <Text
                  style={[
                    styles.emptySubtitle,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  Escribe el primero y empieza la conversación.
                </Text>
              </View>
            ) : (
              <FlatList
                ref={flatListRef}
                data={displayMessages}
                renderItem={renderItem}
                keyExtractor={keyExtractor}
                inverted
                // Lista invertida: el relleno superior queda abajo, bajo la barra de escritura
                contentContainerStyle={[
                  styles.listContent,
                  {
                    paddingTop: composerHeight + 12,
                    paddingBottom: topInset + 8,
                  },
                ]}
                showsVerticalScrollIndicator={false}
                keyboardDismissMode="interactive"
                keyboardShouldPersistTaps="handled"
                onScroll={handleScroll}
                scrollEventThrottle={64}
                onEndReached={loadOlder}
                onEndReachedThreshold={0.4}
                onScrollToIndexFailed={({ index, averageItemLength }) => {
                  flatListRef.current?.scrollToOffset({
                    offset: index * averageItemLength,
                    animated: true,
                  });
                }}
                ListFooterComponent={
                  isLoadingMore ? (
                    <ActivityIndicator
                      style={styles.loadingMore}
                      color={theme.colors.onSurfaceVariant}
                    />
                  ) : null
                }
                maxToRenderPerBatch={15}
                windowSize={10}
                removeClippedSubviews={Platform.OS === "android"}
              />
            )}

            {showJump && !isLoading && (
              <View
                style={[styles.jumpButton, { bottom: composerHeight + 12 }]}
                pointerEvents="box-none"
              >
                <CircleButton
                  icon="chevron-down"
                  label="Ir al último mensaje"
                  onPress={() =>
                    flatListRef.current?.scrollToOffset({
                      offset: 0,
                      animated: true,
                    })
                  }
                />
              </View>
            )}

            {/* La barra flota sobre la lista: los mensajes pasan por debajo del cristal */}
            <View
              style={styles.composer}
              onLayout={(e) => setComposerHeight(e.nativeEvent.layout.height)}
            >
              <ChatComposer
                ref={inputRef}
                value={inputText}
                onChangeText={setInputText}
                onSend={handleSend}
                busy={isSavingEdit}
                context={composerContext}
                onCancelContext={handleCancelContext}
              />
            </View>
          </View>
        </Animated.View>

        <FloatingTopBar
          onBack={() => router.back()}
          center={
            group && (
              <ChatTitle
                name={group.name}
                coverUri={group.cover_image_url}
                memberCount={group.members.length}
                onPress={() => setShowMembers(true)}
              />
            )
          }
        />

        {group && (
          <MemberListBottomSheet
            visible={showMembers}
            onDismiss={() => setShowMembers(false)}
            members={group.members}
          />
        )}
      </BlurTargetView>

      <OptionsMenu
        visible={menuVisible}
        title={menuIsMine ? "Tu mensaje" : (menuMessage?.sender_name ?? "")}
        header={
          menuMessage && (
            <View
              style={[styles.menuPreview, { backgroundColor: neutralFill }]}
            >
              <Text
                style={[
                  styles.menuPreviewText,
                  { color: theme.colors.onSurface },
                ]}
                numberOfLines={4}
              >
                {menuMessage.content}
              </Text>
              <Text
                style={[
                  styles.menuPreviewTime,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {formatMessageTime(menuMessage.created_at)}
                {menuMessage.is_edited ? " · editado" : ""}
              </Text>
            </View>
          )
        }
        options={menuOptions}
        onDismiss={() => setMenuVisible(false)}
        blurTarget={backgroundRef}
      />

      <ConfirmDialog
        visible={!!deleteTarget}
        title="Eliminar mensaje"
        message="El mensaje será eliminado para todos los miembros del grupo."
        type="error"
        confirmText="Eliminar"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        showCancel={true}
        blurTargetRef={backgroundRef}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  title: {
    height: 44,
    borderRadius: 22,
    maxWidth: "100%",
  },
  titleSolid: {
    borderWidth: StyleSheet.hairlineWidth,
  },
  titleContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    paddingLeft: 6,
    paddingRight: 18,
  },
  titleText: { flexShrink: 1 },
  titleName: { fontFamily: "Archivo-SemiBold", fontSize: 15, lineHeight: 18 },
  titleMeta: { fontFamily: "Archivo-Regular", fontSize: 11.5, lineHeight: 14 },

  listContent: {
    paddingHorizontal: 10,
    flexGrow: 1,
  },
  loadingMore: { paddingVertical: 16 },

  dateSeparator: {
    alignItems: "center",
    marginTop: 18,
    marginBottom: 8,
  },
  dateBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  dateText: { fontFamily: "Archivo-Medium", fontSize: 12 },

  composer: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 0,
  },
  jumpButton: {
    position: "absolute",
    right: 16,
  },

  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIconBg: {
    width: 76,
    height: 76,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18,
  },
  emptyTitle: { fontFamily: "Archivo-Bold", fontSize: 20, marginBottom: 6 },
  emptySubtitle: {
    fontFamily: "Archivo-Regular",
    fontSize: 15,
    textAlign: "center",
    lineHeight: 21,
  },

  skeletonContainer: {
    flex: 1,
    paddingHorizontal: 16,
    flexDirection: "column-reverse",
  },
  skRow: { flexDirection: "row", alignItems: "flex-end", marginVertical: 4 },
  skMine: { justifyContent: "flex-end" },
  skTheirs: { justifyContent: "flex-start" },
  skAvatar: { width: 30, height: 30, borderRadius: 15, marginRight: 8 },
  skBubble: { height: 40, borderRadius: 20 },

  menuPreview: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  menuPreviewText: {
    fontFamily: "Archivo-Regular",
    fontSize: 15,
    lineHeight: 21,
  },
  menuPreviewTime: {
    fontFamily: "Archivo-Regular",
    fontSize: 12,
    marginTop: 6,
  },
});
