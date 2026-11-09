/**
 * Burbuja de mensaje
 * Renderiza cada mensaje del chat agrupado por autor, con gesto de respuesta y cita del mensaje respondido.
 */

import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import SquircleView from "react-native-fast-squircle";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Text, useTheme } from "react-native-paper";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import {
  getAvatarHue,
  getAvatarSeed,
  UserAvatar,
} from "@/components/ui/UserAvatar";
import { MessageView } from "@/types/database";

export const formatMessageTime = (dateStr: string): string =>
  new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

// El nombre toma el tono del blob del avatar: claro en modo oscuro y oscuro en modo claro, para que se lea
const nameColorFromHue = (hue: number, dark: boolean): string =>
  dark ? `hsl(${hue}, 70%, 72%)` : `hsl(${hue}, 60%, 36%)`;

const isEmojiCodePoint = (code: number): boolean =>
  (code >= 0x1f000 && code <= 0x1faff) ||
  (code >= 0x2600 && code <= 0x27bf) ||
  (code >= 0x2b00 && code <= 0x2bff) ||
  code === 0x200d ||
  code === 0xfe0f;

// Mensajes de uno a tres emojis: se muestran grandes y sin burbuja
const isEmojiOnly = (text: string): boolean => {
  const compact = text.replace(/\s/g, "");
  if (!compact) return false;
  const points = Array.from(compact);
  if (points.length > 12) return false;
  if (!points.every((p) => isEmojiCodePoint(p.codePointAt(0) ?? 0))) {
    return false;
  }
  // Los modificadores y uniones no cuentan como emoji aparte
  const visible = points.filter((p) => {
    const code = p.codePointAt(0) ?? 0;
    return (
      code !== 0x200d &&
      code !== 0xfe0f &&
      !(code >= 0x1f3fb && code <= 0x1f3ff)
    );
  });
  const joiners = points.filter((p) => p.codePointAt(0) === 0x200d).length;
  return visible.length - joiners <= 3;
};

interface MessageBubbleProps {
  message: MessageView;
  isMine: boolean;
  /** Primer mensaje seguido del mismo autor: lleva el nombre. */
  isFirstInGroup: boolean;
  /** Último mensaje seguido del mismo autor: lleva el avatar y la hora. */
  isLastInGroup: boolean;
  /** Destello breve al llegar al mensaje desde una cita. */
  highlighted?: boolean;
  onReply: (message: MessageView) => void;
  onLongPress: (message: MessageView) => void;
  onPressQuote?: (message: MessageView) => void;
}

const ReplyQuote = React.memo(
  ({
    senderName,
    content,
    isMine,
    onPress,
  }: {
    senderName: string | null;
    content: string | null;
    isMine: boolean;
    onPress?: () => void;
  }) => {
    const theme = useTheme();

    const bgColor = isMine
      ? "rgba(255,255,255,0.16)"
      : theme.dark
        ? "rgba(255,255,255,0.08)"
        : "rgba(0,0,0,0.06)";
    const barColor = isMine ? "rgba(255,255,255,0.7)" : theme.colors.primary;
    const nameColor = isMine ? "rgba(255,255,255,0.95)" : theme.colors.primary;
    const contentColor = isMine
      ? "rgba(255,255,255,0.85)"
      : theme.colors.onSurfaceVariant;

    const preview = (content || "").trim() || "...";
    const name = senderName || "Usuario";

    return (
      <Pressable
        onPress={onPress}
        disabled={!onPress}
        accessibilityRole="button"
        accessibilityLabel={`En respuesta a ${name}: ${preview}`}
        accessibilityHint="Va al mensaje original"
        style={({ pressed }) => [
          s.replyQuote,
          { backgroundColor: bgColor, opacity: pressed ? 0.6 : 1 },
        ]}
      >
        <View style={[s.replyBar, { backgroundColor: barColor }]} />
        <View style={s.replyTextBlock}>
          <Text style={[s.replyName, { color: nameColor }]} numberOfLines={1}>
            {name}
          </Text>
          <Text
            style={[s.replyContent, { color: contentColor }]}
            numberOfLines={2}
          >
            {preview}
          </Text>
        </View>
      </Pressable>
    );
  },
);

ReplyQuote.displayName = "ReplyQuote";

// Recorrido a partir del cual soltar el dedo responde al mensaje
const SWIPE_THRESHOLD = 56;
// Pasado el umbral la burbuja ofrece resistencia en vez de pararse en seco
const SWIPE_RESISTANCE = 0.2;

const MessageBubble = React.memo(
  ({
    message,
    isMine,
    isFirstInGroup,
    isLastInGroup,
    highlighted = false,
    onReply,
    onLongPress,
    onPressQuote,
  }: MessageBubbleProps) => {
    const theme = useTheme();
    const translateX = useSharedValue(0);
    const flash = useSharedValue(0);

    useEffect(() => {
      if (highlighted) {
        flash.value = withSequence(
          withTiming(1, { duration: 180 }),
          withTiming(0, { duration: 900 }),
        );
      }
    }, [highlighted, flash]);

    const armed = useSharedValue(false);

    const triggerReply = useCallback(
      () => onReply(message),
      [message, onReply],
    );

    // El toque avisa al cruzar el umbral, no al soltar: se nota cuándo ya vale con levantar el dedo
    const armHaptic = useCallback(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }, []);

    const panGesture = Gesture.Pan()
      .activeOffsetX(14)
      .failOffsetX(-14)
      .failOffsetY([-12, 12])
      .onUpdate((e) => {
        const x = Math.max(e.translationX, 0);
        translateX.value =
          x <= SWIPE_THRESHOLD
            ? x
            : SWIPE_THRESHOLD + (x - SWIPE_THRESHOLD) * SWIPE_RESISTANCE;

        const reached = x >= SWIPE_THRESHOLD;
        if (reached !== armed.value) {
          armed.value = reached;
          if (reached) runOnJS(armHaptic)();
        }
      })
      .onEnd(() => {
        if (armed.value) runOnJS(triggerReply)();
      })
      .onFinalize(() => {
        armed.value = false;
        translateX.value = withSpring(0, { damping: 22, stiffness: 260 });
      });

    const swipeStyle = useAnimatedStyle(() => ({
      transform: [{ translateX: translateX.value }],
    }));

    // El icono sale de detrás de la burbuja y crece al llegar al umbral
    const replyIconStyle = useAnimatedStyle(() => {
      const progress = Math.min(translateX.value / SWIPE_THRESHOLD, 1);
      return {
        opacity: Math.max(0, (progress - 0.35) / 0.65),
        transform: [
          {
            scale: withSpring(armed.value ? 1.15 : 0.6 + progress * 0.4, {
              damping: 14,
              stiffness: 300,
            }),
          },
        ],
      };
    });

    const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));

    const handleLongPress = useCallback(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      onLongPress(message);
    }, [message, onLongPress]);

    const rowStyle = [
      s.messageRow,
      isMine ? s.myMessageRow : s.theirMessageRow,
      isFirstInGroup && s.groupStart,
    ];

    const time = formatMessageTime(message.created_at);
    const isSending = message.id.startsWith("optimistic-");

    const footer = isLastInGroup && (
      <Text
        style={[
          s.footer,
          isMine ? s.footerMine : s.footerTheirs,
          { color: theme.colors.onSurfaceVariant },
        ]}
      >
        {isSending ? "Enviando…" : time}
      </Text>
    );

    const avatarSeed = getAvatarSeed(message.sender_id, message.group_id);

    const avatarSlot = !isMine && (
      <View style={s.avatarSlot}>
        {isLastInGroup && (
          <UserAvatar
            uri={message.sender_avatar}
            name={message.sender_name}
            seed={avatarSeed}
            size={30}
          />
        )}
      </View>
    );

    if (message.is_deleted) {
      return (
        <View style={rowStyle}>
          {avatarSlot}
          <View
            style={[
              s.bubbleColumn,
              isMine ? s.myBubbleColumn : s.theirBubbleColumn,
            ]}
          >
            <View
              style={[s.deletedBubble, { borderColor: theme.colors.outline }]}
              accessible
              accessibilityLabel={`${isMine ? "Tú" : message.sender_name}: mensaje eliminado`}
            >
              <Ionicons
                name="ban-outline"
                size={14}
                color={theme.colors.onSurfaceVariant}
              />
              <Text
                style={[
                  s.deletedText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                Mensaje eliminado
              </Text>
            </View>
            {footer}
          </View>
        </View>
      );
    }

    const emojiOnly =
      isEmojiOnly(message.content) &&
      !message.reply_to_id &&
      !message.reply_to_content;

    const bubbleBg = isMine
      ? theme.colors.primary
      : theme.colors.surfaceVariant;
    const textColor = isMine ? theme.colors.onPrimary : theme.colors.onSurface;
    const metaColor = isMine
      ? "rgba(255,255,255,0.7)"
      : theme.colors.onSurfaceVariant;

    const nameColor = nameColorFromHue(getAvatarHue(avatarSeed), theme.dark);

    // Las esquinas del lado del autor se cierran entre mensajes seguidos, para que se lean como un bloque
    const tight = 7;
    const corners = isMine
      ? {
          borderTopRightRadius: isFirstInGroup ? 20 : tight,
          borderBottomRightRadius: isLastInGroup ? 20 : tight,
        }
      : {
          borderTopLeftRadius: isFirstInGroup ? 20 : tight,
          borderBottomLeftRadius: isLastInGroup ? 20 : tight,
        };

    const label = [
      `${isMine ? "Tú" : message.sender_name}: ${message.content}`,
      message.is_edited ? "editado" : null,
      isSending ? "enviando" : time,
    ]
      .filter(Boolean)
      .join(", ");

    return (
      // El gesto cubre toda la fila: se puede deslizar desde cualquier punto, no solo sobre la burbuja
      <GestureDetector gesture={panGesture}>
        <View style={rowStyle} collapsable={false}>
          <Animated.View
            style={[
              s.flash,
              { backgroundColor: `${theme.colors.primary}26` },
              flashStyle,
            ]}
            pointerEvents="none"
          />

          {avatarSlot}

          <Animated.View
            style={[
              s.bubbleColumn,
              isMine ? s.myBubbleColumn : s.theirBubbleColumn,
              swipeStyle,
            ]}
          >
            {!isMine && isFirstInGroup && (
              <Text
                style={[s.senderName, { color: nameColor }]}
                numberOfLines={1}
              >
                {message.sender_name}
              </Text>
            )}

            <View>
              <Animated.View
                style={[
                  s.swipeReplyIcon,
                  { backgroundColor: `${theme.colors.primary}26` },
                  replyIconStyle,
                ]}
                pointerEvents="none"
              >
                <Ionicons
                  name="arrow-undo"
                  size={16}
                  color={theme.colors.primary}
                />
              </Animated.View>

              <Pressable
                onLongPress={handleLongPress}
                delayLongPress={350}
                accessibilityLabel={label}
                accessibilityHint="Mantén pulsado para ver las opciones"
                accessibilityActions={[
                  { name: "longpress", label: "Opciones" },
                  { name: "reply", label: "Responder" },
                ]}
                onAccessibilityAction={(e) => {
                  if (e.nativeEvent.actionName === "reply") onReply(message);
                  else onLongPress(message);
                }}
                style={({ pressed }) => ({
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                })}
              >
                {emojiOnly ? (
                  <Text style={s.emojiText}>{message.content}</Text>
                ) : (
                  <SquircleView
                    style={[s.bubble, { backgroundColor: bubbleBg }, corners]}
                    cornerSmoothing={1}
                  >
                    {(message.reply_to_id || message.reply_to_content) && (
                      <ReplyQuote
                        senderName={message.reply_to_sender_name}
                        content={message.reply_to_content}
                        isMine={isMine}
                        onPress={
                          onPressQuote && message.reply_to_id
                            ? () => onPressQuote(message)
                            : undefined
                        }
                      />
                    )}

                    <Text style={[s.messageText, { color: textColor }]}>
                      {message.content}
                      {message.is_edited && (
                        <Text style={[s.editedLabel, { color: metaColor }]}>
                          {"  editado"}
                        </Text>
                      )}
                    </Text>
                  </SquircleView>
                )}
              </Pressable>
            </View>

            {footer}
          </Animated.View>
        </View>
      </GestureDetector>
    );
  },
);

MessageBubble.displayName = "MessageBubble";
export { MessageBubble };

const s = StyleSheet.create({
  messageRow: {
    flexDirection: "row",
    marginVertical: 1.5,
    paddingHorizontal: 6,
  },
  myMessageRow: { justifyContent: "flex-end" },
  theirMessageRow: { justifyContent: "flex-start" },
  groupStart: { marginTop: 10 },

  flash: {
    position: "absolute",
    top: -2,
    bottom: -2,
    left: -12,
    right: -12,
  },

  // Va pegado a la izquierda de la burbuja y se mueve con ella
  swipeReplyIcon: {
    position: "absolute",
    left: -40,
    top: "50%",
    marginTop: -15,
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
  },

  // Reserva el hueco del avatar aunque no se pinte, para alinear las burbujas del grupo
  avatarSlot: {
    width: 30,
    marginRight: 8,
    justifyContent: "flex-end",
    // Deja el avatar a la altura de la burbuja, por encima de la hora
    paddingBottom: 20,
  },

  bubbleColumn: { maxWidth: "78%" },
  myBubbleColumn: { alignItems: "flex-end" },
  theirBubbleColumn: { alignItems: "flex-start" },

  senderName: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 12.5,
    marginBottom: 4,
    marginLeft: 12,
  },

  bubble: {
    borderRadius: 20,
    paddingHorizontal: 13,
    paddingVertical: 9,
    overflow: "hidden",
  },
  messageText: {
    fontFamily: "Archivo-Regular",
    fontSize: 16,
    lineHeight: 22,
  },
  emojiText: {
    fontSize: 46,
    lineHeight: 56,
  },
  editedLabel: {
    fontFamily: "Archivo-Regular",
    fontSize: 11.5,
  },

  footer: {
    fontFamily: "Archivo-Regular",
    fontSize: 11.5,
    lineHeight: 16,
    marginTop: 4,
    height: 16,
  },
  footerMine: { marginRight: 6 },
  footerTheirs: { marginLeft: 12 },

  deletedBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 8,
    paddingHorizontal: 13,
  },
  deletedText: {
    fontFamily: "Archivo-Regular",
    fontSize: 14,
    fontStyle: "italic",
  },

  replyQuote: {
    flexDirection: "row",
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginBottom: 7,
    minWidth: 120,
  },
  replyBar: {
    width: 3,
    borderRadius: 2,
    marginRight: 8,
    alignSelf: "stretch",
  },
  replyTextBlock: {
    flexShrink: 1,
  },
  replyName: {
    fontFamily: "Archivo-SemiBold",
    fontSize: 12.5,
    marginBottom: 1,
  },
  replyContent: {
    fontFamily: "Archivo-Regular",
    fontSize: 13.5,
    lineHeight: 18,
  },
});
