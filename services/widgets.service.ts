import { supabase } from '../lib/supabase';
import { GroupWidgetWithDetails } from '../types/database';

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
};
