import { MessageView } from '@/types/database';

const REPLY_PREVIEW_MAX = 100;

function replyPreviewText(parent: MessageView): string {
  if (parent.is_deleted) return 'Mensaje eliminado';
  const text = parent.content?.trim();
  return text ? text.slice(0, REPLY_PREVIEW_MAX) : '...';
}

/**
 * Fills reply_to_content / reply_to_sender_name from the parent message in the list
 * when the view row is missing them (e.g. replication lag after INSERT).
 */
export function enrichMessagesWithReplies(messages: MessageView[]): MessageView[] {
  const byId = new Map(messages.map((m) => [m.id, m]));

  return messages.map((msg) => {
    if (!msg.reply_to_id) return msg;

    const hasContent = Boolean(msg.reply_to_content?.trim());
    const hasSender = Boolean(msg.reply_to_sender_name?.trim());
    if (hasContent && hasSender) return msg;

    const parent = byId.get(msg.reply_to_id);
    if (!parent) return msg;

    return {
      ...msg,
      reply_to_content: hasContent ? msg.reply_to_content : replyPreviewText(parent),
      reply_to_sender_name: hasSender ? msg.reply_to_sender_name : parent.sender_name,
    };
  });
}

export function mergeReplyContextFrom(
  incoming: MessageView,
  previous: MessageView | undefined,
): MessageView {
  if (!incoming.reply_to_id || !previous) return incoming;

  const hasContent = Boolean(incoming.reply_to_content?.trim());
  const hasSender = Boolean(incoming.reply_to_sender_name?.trim());
  if (hasContent && hasSender) return incoming;

  const sameReply =
    previous.reply_to_id === incoming.reply_to_id ||
    previous.id === incoming.reply_to_id;

  if (!sameReply) return incoming;

  return {
    ...incoming,
    reply_to_content:
      hasContent ? incoming.reply_to_content : previous.reply_to_content ?? incoming.reply_to_content,
    reply_to_sender_name:
      hasSender ? incoming.reply_to_sender_name : previous.reply_to_sender_name ?? incoming.reply_to_sender_name,
  };
}
