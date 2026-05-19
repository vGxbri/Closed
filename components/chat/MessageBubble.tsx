import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import SquircleView from 'react-native-fast-squircle';
import { Text, useTheme } from 'react-native-paper';
import Animated, {
  FadeIn,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { UserAvatar } from '@/components/ui/UserAvatar';
import { MessageView } from '@/types/database';

// ─── Helpers ────────────────────────────────────────────────────────────
const formatTime = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

// ─── Types ──────────────────────────────────────────────────────────────
interface MessageBubbleProps {
  message: MessageView;
  isMine: boolean;
  showAvatar: boolean;
  showName: boolean;
  isOptimistic?: boolean;
  currentUserId: string;
  isAdmin: boolean;
  canEdit: boolean;
  onReply: (message: MessageView) => void;
  onEdit: (message: MessageView) => void;
  onDelete: (message: MessageView) => void;
  onLongPress: (message: MessageView) => void;
}



// ─── Reply Quote ────────────────────────────────────────────────────────
const ReplyQuote = React.memo(({
  senderName,
  content,
}: {
  senderName: string | null;
  content: string | null;
}) => {
  const theme = useTheme();
  if (!senderName && !content) return null;

  return (
    <View style={[s.replyQuote, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
      <View style={[s.replyBar, { backgroundColor: theme.colors.primary }]} />
      <View style={s.replyTextBlock}>
        <Text style={[s.replyName, { color: theme.colors.primary }]} numberOfLines={1}>
          {senderName || 'Usuario'}
        </Text>
        <Text style={[s.replyContent, { color: theme.colors.onSurfaceVariant }]} numberOfLines={1}>
          {content || '...'}
        </Text>
      </View>
    </View>
  );
});

ReplyQuote.displayName = 'ReplyQuote';

// ─── Swipe threshold ────────────────────────────────────────────────────
const SWIPE_THRESHOLD = 60;

// ─── Main Bubble ────────────────────────────────────────────────────────
const MessageBubble = React.memo(({
  message,
  isMine,
  showAvatar,
  showName,
  isOptimistic,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onLongPress,
  canEdit,
}: MessageBubbleProps) => {
  const theme = useTheme();
  const translateX = useSharedValue(0);

  // ─── Swipe gesture for reply ────────────────
  const triggerReply = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onReply(message);
  }, [message, onReply]);

  const panGesture = Gesture.Pan()
    .activeOffsetX(20)
    .failOffsetY([-10, 10])
    .onUpdate((e) => {
      const clamp = Math.min(Math.max(e.translationX, 0), SWIPE_THRESHOLD + 20);
      translateX.value = clamp;
    })
    .onEnd(() => {
      if (translateX.value >= SWIPE_THRESHOLD) {
        runOnJS(triggerReply)();
      }
      translateX.value = withSpring(0, { damping: 20, stiffness: 200 });
    });

  const swipeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const replyIconStyle = useAnimatedStyle(() => ({
    opacity: Math.min(translateX.value / SWIPE_THRESHOLD, 1),
    transform: [{ scale: Math.min(translateX.value / SWIPE_THRESHOLD, 1) }],
  }));

  // ─── Long press ─────────────────────────────
  const handleLongPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLongPress(message);
  }, [message, onLongPress]);



  // ─── Deleted message ────────────────────────
  if (message.is_deleted) {
    return (
      <Animated.View
        entering={FadeIn.duration(200)}
        style={[s.messageRow, isMine ? s.myMessageRow : s.theirMessageRow]}
      >
        {!isMine && <View style={s.avatarSlot} />}
        <View style={[s.bubbleColumn, isMine ? s.myBubbleColumn : s.theirBubbleColumn]}>
          <SquircleView
            style={[
              s.bubble,
              s.deletedBubble,
              { backgroundColor: theme.dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)' },
            ]}
            cornerSmoothing={1}
          >
            <View style={s.deletedRow}>
              <Ionicons name="ban-outline" size={14} color={theme.colors.outline} />
              <Text style={[s.deletedText, { color: theme.colors.outline }]}>
                Este mensaje ha sido eliminado
              </Text>
            </View>
          </SquircleView>
        </View>
      </Animated.View>
    );
  }

  // ─── Colors ─────────────────────────────────
  const bubbleBg = isMine ? theme.colors.primary : theme.colors.surfaceVariant;
  const textColor = isMine ? theme.colors.onPrimary : theme.colors.onSurface;

  return (
    <View style={[s.messageRow, isMine ? s.myMessageRow : s.theirMessageRow]}>
      {/* Reply swipe icon */}
      <Animated.View style={[s.swipeReplyIcon, replyIconStyle]}>
        <Ionicons name="arrow-undo" size={18} color={theme.colors.primary} />
      </Animated.View>

      {/* Avatar slot */}
      {!isMine && (
        <View style={s.avatarSlot}>
          {showAvatar && (
            <UserAvatar
              uri={message.sender_avatar}
              name={message.sender_name}
              size="sm"
            />
          )}
        </View>
      )}

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[
          s.bubbleColumn,
          isMine ? s.myBubbleColumn : s.theirBubbleColumn,
          swipeStyle,
        ]}>
          {/* Sender name */}
          {!isMine && showName && (
            <Text style={[s.senderName, { color: theme.colors.primary }]}>
              {message.sender_name}
            </Text>
          )}

          {/* Bubble */}
          <Pressable onLongPress={handleLongPress} delayLongPress={400}>
            <SquircleView
              style={[
                s.bubble,
                { backgroundColor: bubbleBg },
                isMine ? s.myBubble : s.theirBubble,
                isOptimistic && { opacity: 0.7 },
              ]}
              cornerSmoothing={1}
            >
              {/* Reply quote inside bubble */}
              {message.reply_to_id && (
                <ReplyQuote
                  senderName={message.reply_to_sender_name}
                  content={message.reply_to_content}
                />
              )}

              <Text style={[s.messageText, { color: textColor }]}>
                {message.content}
              </Text>

              {/* Timestamp + edited label inside bubble */}
              <View style={[s.inlineMeta, isMine ? s.myInlineMeta : s.theirInlineMeta]}>
                {message.is_edited && (
                  <Text style={[s.editedLabel, { color: isMine ? 'rgba(255,255,255,0.6)' : theme.colors.outline }]}>
                    editado
                  </Text>
                )}
                <Text style={[s.timestamp, { color: isMine ? 'rgba(255,255,255,0.6)' : theme.colors.outline }]}>
                  {formatTime(message.created_at)}
                </Text>
                {isOptimistic && (
                  <Ionicons name="time-outline" size={10} color={isMine ? 'rgba(255,255,255,0.5)' : theme.colors.outline} />
                )}
              </View>
            </SquircleView>
          </Pressable>


        </Animated.View>
      </GestureDetector>
    </View>
  );
});

MessageBubble.displayName = 'MessageBubble';
export { MessageBubble };

// ─── Styles ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  messageRow: {
    flexDirection: 'row',
    marginVertical: 2,
    paddingHorizontal: 4,
    position: 'relative',
  },
  myMessageRow: { justifyContent: 'flex-end' },
  theirMessageRow: { justifyContent: 'flex-start' },

  swipeReplyIcon: {
    position: 'absolute',
    left: 8,
    top: '50%',
    marginTop: -12,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: -1,
  },

  avatarSlot: { width: 32, marginRight: 8, alignSelf: 'flex-end', marginBottom: 4 },

  bubbleColumn: { maxWidth: '78%' },
  myBubbleColumn: { alignItems: 'flex-end' },
  theirBubbleColumn: { alignItems: 'flex-start' },

  senderName: {
    fontFamily: 'Archivo-Bold',
    fontSize: 12,
    marginBottom: 3,
    marginLeft: 6,
  },

  bubble: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 6,
    borderRadius: 20,
    minHeight: 36,
  },
  myBubble: { borderBottomRightRadius: 6 },
  theirBubble: { borderBottomLeftRadius: 6 },

  deletedBubble: {
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: 'rgba(128,128,128,0.3)',
  },
  deletedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deletedText: {
    fontFamily: 'Archivo-Medium',
    fontSize: 13,
    fontStyle: 'italic',
  },

  messageText: {
    fontFamily: 'Archivo-Medium',
    fontSize: 15,
    lineHeight: 21,
  },

  inlineMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  myInlineMeta: { justifyContent: 'flex-end' },
  theirInlineMeta: { justifyContent: 'flex-start' },

  timestamp: {
    fontFamily: 'Archivo-Medium',
    fontSize: 10,
    letterSpacing: 0.2,
  },
  editedLabel: {
    fontFamily: 'Archivo-Medium',
    fontSize: 10,
    fontStyle: 'italic',
  },

  // Reply quote
  replyQuote: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
    overflow: 'hidden',
  },
  replyBar: { width: 3, borderRadius: 2, marginRight: 8 },
  replyTextBlock: { flex: 1 },
  replyName: { fontFamily: 'Archivo-Bold', fontSize: 11 },
  replyContent: { fontFamily: 'Archivo-Medium', fontSize: 12, marginTop: 1 },


});
