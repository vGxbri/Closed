import { supabase } from '@/lib/supabase';
import { Message, MessageView } from '@/types/database';

// Time window (ms) in which a message can be edited
const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

class MessagesService {
  /**
   * Fetches messages for a group with sender details, replies, and reactions.
   */
  async getMessages(groupId: string, limit = 50, offset = 0): Promise<MessageView[]> {
    const { data, error } = await supabase
      .from('messages_view')
      .select('*')
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Error fetching messages:', error);
      throw error;
    }

    return (data || []).map(this.parseMessageView);
  }

  /**
   * Sends a new message to a group, optionally as a reply.
   */
  async sendMessage(
    groupId: string,
    content: string,
    type: Message['type'] = 'text',
    replyToId?: string | null
  ): Promise<Message> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const insertData: Record<string, unknown> = {
      group_id: groupId,
      sender_id: user.id,
      content,
      type,
    };

    if (replyToId) {
      insertData.reply_to_id = replyToId;
    }

    const { data, error } = await supabase
      .from('messages')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      throw error;
    }

    return data;
  }

  /**
   * Edits a message's content (only within 15-minute window).
   */
  async editMessage(messageId: string, newContent: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Fetch current message to check ownership and timing
    const { data: msg, error: fetchErr } = await supabase
      .from('messages')
      .select('sender_id, created_at')
      .eq('id', messageId)
      .single();

    if (fetchErr || !msg) throw new Error('Message not found');
    if (msg.sender_id !== user.id) throw new Error('Cannot edit others\' messages');

    const elapsed = Date.now() - new Date(msg.created_at).getTime();
    if (elapsed > EDIT_WINDOW_MS) throw new Error('Edit window expired (15 min)');

    const { error } = await supabase
      .from('messages')
      .update({ content: newContent, is_edited: true })
      .eq('id', messageId)
      .eq('sender_id', user.id);

    if (error) {
      console.error('Error editing message:', error);
      throw error;
    }
  }

  /**
   * Checks if a message is still editable (own message + within 15 min).
   */
  canEdit(message: MessageView, currentUserId: string): boolean {
    if (message.sender_id !== currentUserId) return false;
    if (message.is_deleted) return false;
    const elapsed = Date.now() - new Date(message.created_at).getTime();
    return elapsed <= EDIT_WINDOW_MS;
  }

  /**
   * Soft-deletes a message (sets is_deleted = true, clears content).
   * Owner can delete own messages; admins/owners can delete any message in the group.
   */
  async deleteMessage(messageId: string, isGroupAdmin: boolean): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // If admin, we allow deleting any message; otherwise only own
    const query = supabase
      .from('messages')
      .update({
        is_deleted: true,
        content: '',
        metadata: { deleted_by: user.id },
      })
      .eq('id', messageId);

    if (!isGroupAdmin) {
      query.eq('sender_id', user.id);
    }

    const { error } = await query;

    if (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  /**
   * Toggles a reaction on a message.
   * If the user already reacted with this emoji, removes it. Otherwise adds it.
   */
  async toggleReaction(messageId: string, emoji: string): Promise<'added' | 'removed'> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Check if reaction exists
    const { data: existing } = await supabase
      .from('message_reactions')
      .select('id')
      .eq('message_id', messageId)
      .eq('user_id', user.id)
      .eq('emoji', emoji)
      .maybeSingle();

    if (existing) {
      // Remove
      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('id', existing.id);

      if (error) throw error;
      return 'removed';
    } else {
      // Add
      const { error } = await supabase
        .from('message_reactions')
        .insert({ message_id: messageId, user_id: user.id, emoji });

      if (error) throw error;
      return 'added';
    }
  }

  /**
   * Subscribes to real-time message updates for a specific group.
   * Handles INSERT, UPDATE, and DELETE events.
   */
  subscribeToMessages(
    groupId: string,
    callbacks: {
      onNewMessage: (message: MessageView) => void;
      onMessageUpdated: (message: MessageView) => void;
      onMessageDeleted: (messageId: string) => void;
    }
  ) {
    return supabase
      .channel(`group-messages:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          const fullMsg = await this.fetchMessageViewById(payload.new.id);
          if (fullMsg) callbacks.onNewMessage(fullMsg);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
          filter: `group_id=eq.${groupId}`,
        },
        async (payload) => {
          if (payload.new.is_deleted) {
            // Treat as a delete visually — fetch the updated view row so
            // the UI can render the "message deleted" placeholder.
            const fullMsg = await this.fetchMessageViewById(payload.new.id);
            if (fullMsg) callbacks.onMessageUpdated(fullMsg);
          } else {
            const fullMsg = await this.fetchMessageViewById(payload.new.id);
            if (fullMsg) callbacks.onMessageUpdated(fullMsg);
          }
        }
      )
      .subscribe();
  }

  /**
   * Subscribes to reaction changes on messages in a group.
   * Returns a channel that can be unsubscribed.
   */
  subscribeToReactions(
    groupId: string,
    onReactionChange: (messageId: string) => void
  ) {
    return supabase
      .channel(`group-reactions:${groupId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
        },
        async (payload) => {
          const messageId = (payload.new as Record<string, unknown>)?.message_id
            || (payload.old as Record<string, unknown>)?.message_id;
          if (messageId && typeof messageId === 'string') {
            // Check if this message belongs to our group
            const { data } = await supabase
              .from('messages')
              .select('group_id')
              .eq('id', messageId)
              .single();
            if (data?.group_id === groupId) {
              onReactionChange(messageId);
            }
          }
        }
      )
      .subscribe();
  }

  /**
   * Fetches a single message from the view by ID.
   * Includes retries for view replication lag.
   */
  private async fetchMessageViewById(messageId: string): Promise<MessageView | null> {
    const maxRetries = 3;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const { data, error } = await supabase
        .from('messages_view')
        .select('*')
        .eq('id', messageId)
        .single();

      if (!error && data) {
        return this.parseMessageView(data);
      }

      if (attempt < maxRetries - 1) {
        await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
      }
    }
    return null;
  }

  /**
   * Re-fetches a single message to get updated reactions.
   */
  async refreshMessage(messageId: string): Promise<MessageView | null> {
    return this.fetchMessageViewById(messageId);
  }

  /**
   * Parses raw DB row to ensure reactions is always an array.
   */
  private parseMessageView(raw: Record<string, unknown>): MessageView {
    return {
      ...raw,
      reactions: Array.isArray(raw.reactions) ? raw.reactions : [],
    } as MessageView;
  }
}

export const messagesService = new MessagesService();
