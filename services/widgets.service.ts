/**
 * Servicio de widgets del grupo
 * Widgets activables por grupo desde catálogo en Supabase.
 */

import { supabase } from '../lib/supabase';
import { GroupWidgetWithDetails, Widget } from '../types/database';

export const widgetsService = {
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

  async addWidgetToGroup(groupId: string, widgetId: string): Promise<void> {
    // Reactivar fila existente en lugar de duplicar
    const { data: existing } = await supabase
      .from('group_widgets')
      .select('id, is_active')
      .eq('group_id', groupId)
      .eq('widget_id', widgetId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('group_widgets')
        .update({ is_active: true })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
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

  async removeWidgetFromGroup(groupId: string, widgetId: string): Promise<void> {
    const { error } = await supabase
      .from('group_widgets')
      .update({ is_active: false })
      .eq('group_id', groupId)
      .eq('widget_id', widgetId);

    if (error) throw error;
  },
};
