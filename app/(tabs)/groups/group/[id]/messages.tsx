import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { Stack, useGlobalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import SquircleView from 'react-native-fast-squircle';
import { Text, useTheme } from 'react-native-paper';
import Animated, {
  FadeIn,
  SlideInDown,
  useAnimatedKeyboard,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CustomHeader } from '@/components/ui/CustomHeader';
import { useAuth, useGroup } from '@/hooks';
import { messagesService } from '@/services';
import { MessageView } from '@/types/database';

// Height of the floating tab bar + its bottom margin
// Must stay in sync with _layout.tsx FloatingTabBar
const FLOATING_TAB_BAR_HEIGHT = 64;
const FLOATING_TAB_BAR_EXTRA_MARGIN = 16; // margin below the bar

// ─── Helpers ────────────────────────────────────────────────────────────
const formatTime = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const formatDateSeparator = (dateStr: string): string => {
  const date = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diff = today.getTime() - msgDate.getTime();
  const dayMs = 86400000;

  if (diff < dayMs) return 'Hoy';
  if (diff < dayMs * 2) return 'Ayer';
  if (diff < dayMs * 7) {
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return days[date.getDay()];
  }
  return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
};

const isSameDay = (a: string, b: string): boolean => {
  const da = new Date(a);
  const db = new Date(b);
  return da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate();
};

// ─── Date Separator ─────────────────────────────────────────────────────
const DateSeparator = React.memo(({ dateStr }: { dateStr: string }) => {
  const theme = useTheme();
  return (
    <View style={styles.dateSeparator}>
      <View style={[styles.dateLine, { backgroundColor: theme.colors.outlineVariant }]} />
      <SquircleView
        style={[styles.dateBadge, { backgroundColor: theme.colors.surfaceVariant }]}
        cornerSmoothing={1}
      >
        <Text style={[styles.dateText, { color: theme.colors.onSurfaceVariant }]}>
          {formatDateSeparator(dateStr)}
        </Text>
      </SquircleView>
      <View style={[styles.dateLine, { backgroundColor: theme.colors.outlineVariant }]} />
    </View>
  );
});

DateSeparator.displayName = 'DateSeparator';

// ─── Message Bubble ─────────────────────────────────────────────────────
interface MessageBubbleProps {
  message: MessageView;
  isMine: boolean;
  showAvatar: boolean;
  showName: boolean;
  isOptimistic?: boolean;
}

const MessageBubble = React.memo(({
  message,
  isMine,
  showAvatar,
  showName,
  isOptimistic,
}: MessageBubbleProps) => {
  const theme = useTheme();

  const bubbleBg = useMemo(() =>
    isMine ? theme.colors.primary : theme.colors.surfaceVariant,
    [isMine, theme.colors.primary, theme.colors.surfaceVariant]
  );

  const textColor = useMemo(() =>
    isMine ? theme.colors.onPrimary : theme.colors.onSurfaceVariant,
    [isMine, theme.colors.onPrimary, theme.colors.onSurfaceVariant]
  );

  return (
    <Animated.View
      entering={FadeIn.duration(250)}
      style={[
        styles.messageRow,
        isMine ? styles.myMessageRow : styles.theirMessageRow,
      ]}
    >
      {/* Avatar slot (keeps alignment even when hidden) */}
      {!isMine && (
        <View style={styles.avatarSlot}>
          {showAvatar ? (
            <Image
              source={message.sender_avatar || undefined}
              style={styles.avatar}
              contentFit="cover"
              placeholder={undefined}
            />
          ) : null}
        </View>
      )}

      <View style={[
        styles.bubbleColumn,
        isMine ? styles.myBubbleColumn : styles.theirBubbleColumn,
      ]}>
        {/* Sender name */}
        {!isMine && showName && (
          <Text style={[styles.senderName, { color: theme.colors.primary }]}>
            {message.sender_name}
          </Text>
        )}

        {/* Bubble */}
        <SquircleView
          style={[
            styles.bubble,
            { backgroundColor: bubbleBg },
            isMine ? styles.myBubble : styles.theirBubble,
            isOptimistic && { opacity: 0.7 },
          ]}
          cornerSmoothing={1}
        >
          <Text style={[styles.messageText, { color: textColor }]}>
            {message.content}
          </Text>
        </SquircleView>

        {/* Timestamp */}
        <View style={[styles.metaRow, isMine ? styles.myMeta : styles.theirMeta]}>
          <Text style={[styles.timestamp, { color: theme.colors.outline }]}>
            {formatTime(message.created_at)}
          </Text>
          {isOptimistic && (
            <Ionicons
              name="time-outline"
              size={10}
              color={theme.colors.outline}
              style={{ marginLeft: 4 }}
            />
          )}
        </View>
      </View>
    </Animated.View>
  );
});

MessageBubble.displayName = 'MessageBubble';

// ─── Skeleton Loading ───────────────────────────────────────────────────
const MessageSkeleton = React.memo(({ index }: { index: number }) => {
  const theme = useTheme();
  const isMine = index % 3 === 0;
  const width = [180, 220, 140, 260, 160][index % 5];

  return (
    <Animated.View
      entering={FadeIn.duration(400).delay(index * 60)}
      style={[
        styles.messageRow,
        isMine ? styles.myMessageRow : styles.theirMessageRow,
      ]}
    >
      {!isMine && (
        <View style={styles.avatarSlot}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.surfaceVariant }]} />
        </View>
      )}
      <View style={[styles.bubbleColumn, isMine ? styles.myBubbleColumn : styles.theirBubbleColumn]}>
        {!isMine && (
          <View
            style={[styles.skeletonName, { backgroundColor: theme.colors.surfaceVariant }]}
          />
        )}
        <SquircleView
          style={[
            styles.bubble,
            {
              backgroundColor: theme.colors.surfaceVariant,
              width,
              height: 36,
            },
            isMine ? styles.myBubble : styles.theirBubble,
          ]}
          cornerSmoothing={1}
        />
      </View>
    </Animated.View>
  );
});

MessageSkeleton.displayName = 'MessageSkeleton';

// ─── Main Screen ────────────────────────────────────────────────────────
export default function MessagesScreen() {
  const { id } = useGlobalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { group } = useGroup(id as string);
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [messages, setMessages] = useState<MessageView[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // Calculate bottom padding bounds
  const bottomMargin = insets.bottom > 0 ? insets.bottom + 12 : 36;
  const maxPadding = bottomMargin + FLOATING_TAB_BAR_HEIGHT + FLOATING_TAB_BAR_EXTRA_MARGIN;

  const keyboard = useAnimatedKeyboard();

  const animatedKeyboardStyle = useAnimatedStyle(() => {
    // Keyboard height is strictly 0 when closed, and > 0 when open.
    // On iOS, this perfectly tracks the interactive keyboard gesture.
    const kbHeight = keyboard.height.value;
    
    // Base extra padding when keyboard is open so it doesn't touch the screen edge
    const extraPadding = Platform.OS === 'ios' ? 8 : 8;
    
    return {
      paddingBottom: Math.max(maxPadding, kbHeight + extraPadding),
    };
  });

  // Optimistic message IDs (track which messages are still sending)
  const [optimisticIds, setOptimisticIds] = useState<Set<string>>(new Set());

  // ─── Send button animation ──────────────────────
  const sendScale = useSharedValue(1);
  const hasText = inputText.trim().length > 0;

  const sendAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sendScale.value }],
  }));

  // ─── Load messages ──────────────────────────────
  useEffect(() => {
    if (!id) { setIsLoading(false); return; }

    let isMounted = true;

    const loadMessages = async () => {
      try {
        const data = await messagesService.getMessages(id as string);
        if (isMounted) setMessages(data);
      } catch (error) {
        console.error('Error loading messages:', error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadMessages();

    // Subscribe to realtime updates
    const subscription = messagesService.subscribeToMessages(
      id as string,
      (newMessage) => {
        if (!isMounted) return;
        setMessages((prev) => {
          // Replace optimistic message if it exists, or prepend
          const withoutOptimistic = prev.filter(
            (m) => !(m.id.startsWith('optimistic-') && m.sender_id === newMessage.sender_id && m.content === newMessage.content)
          );
          // Don't add if already present (by real ID)
          if (withoutOptimistic.some((m) => m.id === newMessage.id)) return withoutOptimistic;
          return [newMessage, ...withoutOptimistic];
        });
        // Remove from optimistic set
        setOptimisticIds((prev) => {
          const next = new Set(prev);
          // We can't match by ID since optimistic IDs are different, so we just clear after receiving
          return next;
        });
      },
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [id]);

  // ─── Send message ──────────────────────────────
  const handleSend = useCallback(async () => {
    if (!inputText.trim() || isSending || !id || !user) return;

    const text = inputText.trim();
    setInputText('');
    setIsSending(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Animate send button
    sendScale.value = withSpring(0.8, { damping: 15 }, () => {
      sendScale.value = withSpring(1, { damping: 10 });
    });

    // Optimistic message
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMessage: MessageView = {
      id: optimisticId,
      group_id: id as string,
      sender_id: user.id,
      content: text,
      type: 'text',
      metadata: null,
      is_edited: false,
      created_at: new Date().toISOString(),
      sender_name: user.user_metadata?.display_name || 'Tú',
      sender_avatar: user.user_metadata?.avatar_url || null,
    };

    setMessages((prev) => [optimisticMessage, ...prev]);
    setOptimisticIds((prev) => new Set(prev).add(optimisticId));

    try {
      await messagesService.sendMessage(id as string, text);
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on failure, restore input
      setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
      setOptimisticIds((prev) => {
        const next = new Set(prev);
        next.delete(optimisticId);
        return next;
      });
      setInputText(text);
    } finally {
      setIsSending(false);
    }
  }, [inputText, isSending, id, user, sendScale]);

  // ─── Render helpers ──────────────────────────────
  const renderItem = useCallback(({ item, index }: { item: MessageView; index: number }) => {
    const isMine = item.sender_id === user?.id;
    const prevMessage = messages[index + 1]; // +1 because list is inverted
    const nextMessage = messages[index - 1];

    // Show avatar only when it's the last message in a group from the same sender
    const isLastInGroup = !nextMessage || nextMessage.sender_id !== item.sender_id;
    // Show name when it's the first message in a group from the same sender
    const isFirstInGroup = !prevMessage || prevMessage.sender_id !== item.sender_id;

    return (
      <MessageBubble
        message={item}
        isMine={isMine}
        showAvatar={!isMine && isLastInGroup}
        showName={!isMine && isFirstInGroup}
        isOptimistic={optimisticIds.has(item.id)}
      />
    );
  }, [user?.id, messages, optimisticIds]);

  const keyExtractor = useCallback((item: MessageView) => item.id, []);

  // ─── Empty state ──────────────────────────────
  const EmptyComponent = useMemo(() => {
    if (isLoading) return null;
    return (
      <View style={styles.emptyContainer}>
        <SquircleView
          style={[styles.emptyIconBg, { backgroundColor: theme.colors.surfaceVariant }]}
          cornerSmoothing={1}
        >
          <Ionicons name="chatbubbles-outline" size={36} color={theme.colors.primary} />
        </SquircleView>
        <Text style={[styles.emptyTitle, { color: theme.colors.onSurface }]}>
          Sin mensajes aún
        </Text>
        <Text style={[styles.emptySubtitle, { color: theme.colors.onSurfaceVariant }]}>
          ¡Escribe algo para empezar la conversación!
        </Text>
      </View>
    );
  }, [isLoading, theme]);

  // ─── Skeleton list ──────────────────────────────
  const SkeletonList = useMemo(() => (
    <View style={styles.skeletonContainer}>
      {Array.from({ length: 8 }).map((_, i) => (
        <MessageSkeleton key={i} index={i} />
      ))}
    </View>
  ), []);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <CustomHeader title={group?.name || 'Mensajes'} showBackButton={true} />

      {/* Separator line below header to visually detach it from the input area */}
      <View style={[styles.headerSeparator, { backgroundColor: theme.colors.outlineVariant }]} />

      <Animated.View style={[styles.keyboardView, animatedKeyboardStyle]}>
        {/* Messages list */}
        {isLoading ? (
          SkeletonList
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            inverted
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={EmptyComponent}
            // Performance optimizations
            maxToRenderPerBatch={15}
            windowSize={10}
            removeClippedSubviews={Platform.OS === 'android'}
          />
        )}

        {/* ─── Input Area ─── */}
        <Animated.View
          style={[
            styles.inputContainer,
            {
              backgroundColor: theme.colors.background,
              paddingBottom: 8, // The wrapper Animated.View handles the dynamic padding
              borderTopColor: theme.colors.outlineVariant,
            },
          ]}
        >
          <View style={styles.inputRow}>
            <SquircleView
              style={[
                styles.inputWrapper,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  borderColor: theme.colors.outlineVariant,
                  borderWidth: 1,
                },
              ]}
              cornerSmoothing={1}
            >
              <TextInput
                ref={inputRef}
                style={[styles.input, { color: theme.colors.onSurface }]}
                placeholder="Escribe un mensaje..."
                placeholderTextColor={theme.colors.outline}
                value={inputText}
                onChangeText={setInputText}
                multiline
                maxLength={2000}
                textAlignVertical="center"
              />
            </SquircleView>

            {/* Send button */}
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
                  name="arrow-up"
                  size={20}
                  color={hasText ? theme.colors.onPrimary : theme.colors.outline}
                />
              </Pressable>
            </Animated.View>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  headerSeparator: {
    height: StyleSheet.hairlineWidth,
    width: '100%',
  },

  // ─── List ──────────────────────
  listContent: {
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
    flexGrow: 1,
  },

  // ─── Date separator ───────────
  dateSeparator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
    paddingHorizontal: 8,
  },
  dateLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dateBadge: {
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 12,
    marginHorizontal: 10,
  },
  dateText: {
    fontFamily: 'Archivo-Medium',
    fontSize: 11,
    letterSpacing: 0.3,
  },

  // ─── Message row ──────────────
  messageRow: {
    flexDirection: 'row',
    marginVertical: 2,
    paddingHorizontal: 4,
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  theirMessageRow: {
    justifyContent: 'flex-start',
  },

  // ─── Avatar ───────────────────
  avatarSlot: {
    width: 32,
    marginRight: 8,
    alignSelf: 'flex-end',
    marginBottom: 18, // align with bubble bottom
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },

  // ─── Bubble ───────────────────
  bubbleColumn: {
    maxWidth: '78%',
  },
  myBubbleColumn: {
    alignItems: 'flex-end',
  },
  theirBubbleColumn: {
    alignItems: 'flex-start',
  },
  senderName: {
    fontFamily: 'Archivo-Bold',
    fontSize: 12,
    marginBottom: 3,
    marginLeft: 6,
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    minHeight: 36,
  },
  myBubble: {
    borderBottomRightRadius: 6,
  },
  theirBubble: {
    borderBottomLeftRadius: 6,
  },
  messageText: {
    fontFamily: 'Archivo-Medium',
    fontSize: 15,
    lineHeight: 21,
  },

  // ─── Meta row ─────────────────
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
    marginBottom: 4,
  },
  myMeta: {
    marginRight: 6,
    justifyContent: 'flex-end',
  },
  theirMeta: {
    marginLeft: 6,
  },
  timestamp: {
    fontFamily: 'Archivo-Medium',
    fontSize: 10,
    letterSpacing: 0.2,
  },

  // ─── Input area ───────────────
  inputContainer: {
    paddingHorizontal: 12,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  inputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 24,
    minHeight: 44,
  },
  input: {
    flex: 1,
    fontFamily: 'Archivo-Medium',
    fontSize: 15,
    lineHeight: 20,
    maxHeight: 120,
    paddingTop: Platform.OS === 'ios' ? 4 : 2,
    paddingBottom: Platform.OS === 'ios' ? 4 : 2,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },

  // ─── Empty state ──────────────
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIconBg: {
    width: 72,
    height: 72,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: 'Archivo-Bold',
    fontSize: 17,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: 'Archivo-Medium',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 32,
  },

  // ─── Skeleton ─────────────────
  skeletonContainer: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    flexDirection: 'column-reverse',
    justifyContent: 'flex-start',
  },
  skeletonName: {
    width: 80,
    height: 10,
    borderRadius: 5,
    marginBottom: 4,
    marginLeft: 6,
  },
});