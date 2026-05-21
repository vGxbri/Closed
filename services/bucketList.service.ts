import { supabase } from '../lib/supabase';
import { uploadMediaToStorage, deleteMediaFromStorage } from '../lib/storage';
import {
  BucketListItem,
  CreateBucketListItemInput,
  BucketListCategory,
} from '../types/database';

const BUCKET = 'bucket-list';

class BucketListService {
  /**
   * Fetches all bucket list items for a group, with optional filters.
   */
  async getItems(
    groupId: string,
    options?: { isCompleted?: boolean; category?: BucketListCategory }
  ): Promise<BucketListItem[]> {
    let query = supabase
      .from('bucket_list_items')
      .select('*')
      .eq('group_id', groupId)
      .order('is_completed', { ascending: true })
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (options?.isCompleted !== undefined) {
      query = query.eq('is_completed', options.isCompleted);
    }
    if (options?.category) {
      query = query.eq('category', options.category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching bucket list items:', error);
      throw error;
    }

    return (data || []) as BucketListItem[];
  }

  /**
   * Gets counts of pending and completed items for widget preview.
   */
  async getItemCounts(groupId: string): Promise<{ pending: number; completed: number }> {
    const [pendingResult, completedResult] = await Promise.all([
      supabase
        .from('bucket_list_items')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .eq('is_completed', false),
      supabase
        .from('bucket_list_items')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .eq('is_completed', true),
    ]);

    if (pendingResult.error) {
      console.error('Error counting pending items:', pendingResult.error);
    }
    if (completedResult.error) {
      console.error('Error counting completed items:', completedResult.error);
    }

    return {
      pending: pendingResult.count || 0,
      completed: completedResult.count || 0,
    };
  }

  /**
   * Creates a new bucket list item.
   */
  async createItem(input: CreateBucketListItemInput): Promise<BucketListItem> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('bucket_list_items')
      .insert({
        group_id: input.group_id,
        title: input.title,
        description: input.description || null,
        category: input.category || 'other',
        image_url: input.image_url || null,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating bucket list item:', error);
      throw error;
    }

    return data as BucketListItem;
  }

  /**
   * Updates a bucket list item.
   */
  async updateItem(
    itemId: string,
    updates: {
      title?: string;
      description?: string | null;
      category?: BucketListCategory;
      image_url?: string | null;
    }
  ): Promise<void> {
    const { error } = await supabase
      .from('bucket_list_items')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', itemId);

    if (error) {
      console.error('Error updating bucket list item:', error);
      throw error;
    }
  }

  /**
   * Toggles the completion status of an item.
   */
  async toggleComplete(itemId: string, completed: boolean): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const updatePayload = completed
      ? {
          is_completed: true,
          completed_at: new Date().toISOString(),
          completed_by: user.id,
        }
      : {
          is_completed: false,
          completed_at: null,
          completed_by: null,
        };

    const { error } = await supabase
      .from('bucket_list_items')
      .update(updatePayload)
      .eq('id', itemId);

    if (error) {
      console.error('Error toggling bucket list item:', error);
      throw error;
    }
  }

  /**
   * Deletes a bucket list item (and its image from storage if any).
   */
  async deleteItem(itemId: string): Promise<void> {
    // First get the item to check for image
    const { data: item } = await supabase
      .from('bucket_list_items')
      .select('image_url')
      .eq('id', itemId)
      .single();

    // Delete image from storage if exists
    if (item?.image_url) {
      try {
        await deleteMediaFromStorage(BUCKET, item.image_url);
      } catch (e) {
        console.error('Error deleting bucket list image from storage:', e);
        // Continue with item deletion even if image deletion fails
      }
    }

    const { error } = await supabase
      .from('bucket_list_items')
      .delete()
      .eq('id', itemId);

    if (error) {
      console.error('Error deleting bucket list item:', error);
      throw error;
    }
  }

  /**
   * Uploads an image for a bucket list item.
   */
  async uploadItemImage(groupId: string, uri: string): Promise<string> {
    const result = await uploadMediaToStorage({
      bucket: BUCKET,
      folder: groupId,
      uri,
    });
    return result.publicUrl;
  }

  /**
   * Links a completed bucket list item to a gallery image.
   */
  async linkToGallery(itemId: string, galleryImageId: string): Promise<void> {
    const { error } = await supabase
      .from('bucket_list_items')
      .update({ gallery_image_id: galleryImageId })
      .eq('id', itemId);

    if (error) {
      console.error('Error linking bucket list item to gallery:', error);
      throw error;
    }
  }
}

export const bucketListService = new BucketListService();
