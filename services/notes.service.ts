import { supabase } from '../lib/supabase';
import { Note, NoteBlock } from '../types/database';

class NotesService {
  /**
   * Fetches all notes for a group, ordered by pinned first then most recent.
   */
  async getNotes(groupId: string): Promise<Note[]> {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('group_id', groupId)
      .order('is_pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching notes:', error);
      throw error;
    }

    return (data || []).map(this.parseNote);
  }

  /**
   * Fetches a single note by ID.
   */
  async getNote(noteId: string): Promise<Note | null> {
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('id', noteId)
      .single();

    if (error) {
      console.error('Error fetching note:', error);
      return null;
    }

    return this.parseNote(data);
  }

  /**
   * Creates a new empty note in a group.
   */
  async createNote(groupId: string, title: string = ''): Promise<Note> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('notes')
      .insert({
        group_id: groupId,
        title,
        content: [],
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating note:', error);
      throw error;
    }

    return this.parseNote(data);
  }

  /**
   * Updates a note's title and/or content.
   */
  async updateNote(
    noteId: string,
    updates: { title?: string; content?: NoteBlock[] }
  ): Promise<void> {
    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.content !== undefined) payload.content = updates.content;

    const { error } = await supabase
      .from('notes')
      .update(payload)
      .eq('id', noteId);

    if (error) {
      console.error('Error updating note:', error);
      throw error;
    }
  }

  /**
   * Toggles the pinned state of a note.
   */
  async togglePin(noteId: string, currentlyPinned: boolean): Promise<void> {
    const { error } = await supabase
      .from('notes')
      .update({ is_pinned: !currentlyPinned, updated_at: new Date().toISOString() })
      .eq('id', noteId);

    if (error) {
      console.error('Error toggling pin:', error);
      throw error;
    }
  }

  /**
   * Deletes a note permanently.
   */
  async deleteNote(noteId: string): Promise<void> {
    const { error } = await supabase
      .from('notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  }

  /**
   * Parses raw DB row to ensure content is always an array.
   */
  private parseNote(raw: Record<string, unknown>): Note {
    return {
      ...raw,
      content: Array.isArray(raw.content) ? raw.content : [],
    } as Note;
  }
}

export const notesService = new NotesService();
