import { supabase } from '../lib/supabase';
import { GroupWidgetWithDetails, Widget } from '../types/database';

export const widgetsService = {
  /**
   * Get all active widgets for a group
   */
  async getGroupWidgets(groupId: string): Promise<GroupWidgetWithDetails[]> {
    const { data, error } = await supabase
      .from('group_widgets')
      .select(`
        *,
        widget:widgets(*)
      `)
      .eq('group_id', groupId)
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data as unknown as GroupWidgetWithDetails[];
  },

  /**
   * Get ALL available widgets from the catalog
   */
  async getAllWidgets(): Promise<Widget[]> {
    const { data, error } = await supabase
      .from('widgets')
      .select('*')
      .neq('category', 'hidden')
      .order('category', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;
    return data as Widget[];
  },

  /**
   * Get all group_widgets rows for a group (including inactive), to know which ones are linked
   */
  async getGroupWidgetLinks(groupId: string): Promise<GroupWidgetWithDetails[]> {
    const { data, error } = await supabase
      .from('group_widgets')
      .select(`
        *,
        widget:widgets(*)
      `)
      .eq('group_id', groupId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    return data as unknown as GroupWidgetWithDetails[];
  },

  /**
   * Add a widget to a group
   */
  async addWidgetToGroup(groupId: string, widgetId: string): Promise<void> {
    // Check if a row already exists (maybe it was deactivated before)
    const { data: existing } = await supabase
      .from('group_widgets')
      .select('id, is_active')
      .eq('group_id', groupId)
      .eq('widget_id', widgetId)
      .maybeSingle();

    if (existing) {
      // Reactivate
      const { error } = await supabase
        .from('group_widgets')
        .update({ is_active: true })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      // Get the next display_order
      const { data: lastWidget } = await supabase
        .from('group_widgets')
        .select('display_order')
        .eq('group_id', groupId)
        .order('display_order', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextOrder = (lastWidget?.display_order ?? -1) + 1;

      const { error } = await supabase
        .from('group_widgets')
        .insert({
          group_id: groupId,
          widget_id: widgetId,
          display_order: nextOrder,
          is_active: true,
        });
      if (error) throw error;
    }
  },

  /**
   * Remove (deactivate) a widget from a group
   */
  async removeWidgetFromGroup(groupId: string, widgetId: string): Promise<void> {
    const { error } = await supabase
      .from('group_widgets')
      .update({ is_active: false })
      .eq('group_id', groupId)
      .eq('widget_id', widgetId);

    if (error) throw error;
  },
};
