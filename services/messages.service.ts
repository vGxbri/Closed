import { supabase } from '@/lib/supabase';
import { Message, MessageView } from '@/types/database';

class MessagesService {
  /**
   * Fetches messages for a group with sender details
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

    return data || [];
  }

  /**
   * Sends a new message to a group
   */
  async sendMessage(groupId: string, content: string, type: Message['type'] = 'text'): Promise<Message> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('messages')
      .insert({
        group_id: groupId,
        sender_id: user.id,
        content,
        type,
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      throw error;
    }

    return data;
  }

  /**
   * Subscribes to real-time message updates for a specific group.
   * When a new message is inserted, we fetch the full view row
   * (which includes sender details) with a small retry in case
   * the view hasn't replicated yet.
   */
  subscribeToMessages(groupId: string, onNewMessage: (message: MessageView) => void) {
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
          const messageId = payload.new.id;

          // Try to fetch the full view row with retries
          // (the view may have a tiny lag behind the base table)
          const maxRetries = 3;
          for (let attempt = 0; attempt < maxRetries; attempt++) {
            const { data, error } = await supabase
              .from('messages_view')
              .select('*')
              .eq('id', messageId)
              .single();

            if (!error && data) {
              onNewMessage(data);
              return;
            }

            // Wait briefly before retrying
            if (attempt < maxRetries - 1) {
              await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
            }
          }

          // Fallback: build a minimal MessageView from the raw payload
          // so the message still appears even if the view query fails
          const fallback: MessageView = {
            id: payload.new.id,
            group_id: payload.new.group_id,
            sender_id: payload.new.sender_id,
            content: payload.new.content,
            type: payload.new.type || 'text',
            metadata: payload.new.metadata,
            is_edited: payload.new.is_edited || false,
            created_at: payload.new.created_at,
            sender_name: 'Usuario',
            sender_avatar: null,
          };
          onNewMessage(fallback);
        },
      )
      .subscribe();
  }
}

export const messagesService = new MessagesService();
