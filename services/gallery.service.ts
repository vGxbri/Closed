import { profileWithGroupMembersSelect, resolveMemberProfileForGroup } from '../lib/memberProfile';
import { supabase } from '../lib/supabase';
import { deleteMediaFromStorage, uploadMediaToStorage } from '../lib/storage';
import { GalleryImage, GalleryImageWithUser } from '../types/database';

function mapGalleryImageWithGroupUploader(
  image: GalleryImageWithUser,
  groupId: string,
): GalleryImageWithUser {
  if (!image.uploader) return image;

  const resolved = resolveMemberProfileForGroup(
    image.uploader as Parameters<typeof resolveMemberProfileForGroup>[0],
    groupId,
  );

  if (!resolved) return image;

  return {
    ...image,
    uploader: {
      ...image.uploader,
      display_name: resolved.display_name,
      avatar_url: resolved.avatar_url,
    },
  };
}

const BUCKET = 'gallery';
const PAGE_SIZE = 20;

export const galleryService = {
  /**
   * Get paginated gallery media for a group
   */
  async getGroupImages(
    groupId: string,
    page: number = 0
  ): Promise<GalleryImageWithUser[]> {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from('gallery_images')
      .select(`
        *,
        uploader:profiles!gallery_images_uploaded_by_profiles_fk(${profileWithGroupMembersSelect})
      `)
      .eq('group_id', groupId)
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return ((data || []) as unknown as GalleryImageWithUser[]).map((image) =>
      mapGalleryImageWithGroupUploader(image, groupId),
    );
  },

  /**
   * Get a random media from a group's gallery (for widget preview)
   */
  async getRandomPreviewImage(groupId: string): Promise<string | null> {
    const { count, error: countError } = await supabase
      .from('gallery_images')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId)
      .eq('media_type', 'image'); // Prefer images for preview if possible

    if (countError || !count || count === 0) return null;

    const randomOffset = Math.floor(Math.random() * count);

    const { data, error } = await supabase
      .from('gallery_images')
      .select('media_url')
      .eq('group_id', groupId)
      .eq('media_type', 'image')
      .order('created_at', { ascending: false })
      .range(randomOffset, randomOffset)
      .single();

    if (error || !data) return null;
    return data.media_url;
  },

  /**
   * Get the latest image from a group's gallery (for widget preview)
   */
  async getLatestImage(groupId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from('gallery_images')
      .select('media_url')
      .eq('group_id', groupId)
      .eq('media_type', 'image') // Preview normally shows images
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return data.media_url;
  },

  /**
   * Get the media count for a group
   */
  async getImageCount(groupId: string): Promise<number> {
    const { count, error } = await supabase
      .from('gallery_images')
      .select('*', { count: 'exact', head: true })
      .eq('group_id', groupId);

    if (error) return 0;
    return count || 0;
  },

  /**
   * Upload a media file to the group gallery
   */
  async uploadImage(
    groupId: string,
    uri: string,
    caption?: string
  ): Promise<GalleryImage> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const extension = uri.split('.').pop()?.toLowerCase() || 'jpg';
    const isVideo = ['mp4', 'mov', 'quicktime', 'm4v'].includes(extension);

    const result = await uploadMediaToStorage({
      bucket: BUCKET,
      folder: groupId,
      uri,
    });

    // Save metadata to DB
    const { data, error } = await supabase
      .from('gallery_images')
      .insert({
        group_id: groupId,
        uploaded_by: user.id,
        media_url: result.publicUrl,
        media_type: isVideo ? 'video' : 'image',
        file_size: result.fileSize,
        caption: caption || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data as GalleryImage;
  },

  /**
   * Upload multiple media files
   */
  async uploadMultipleImages(
    groupId: string,
    uris: string[]
  ): Promise<GalleryImage[]> {
    const results: GalleryImage[] = [];
    for (const uri of uris) {
      const image = await this.uploadImage(groupId, uri);
      results.push(image);
    }
    return results;
  },

  /**
   * Get total storage used by a group's gallery (in bytes)
   */
  async getStorageUsed(groupId: string): Promise<number> {
    const { data, error } = await supabase
      .from('gallery_images')
      .select('file_size')
      .eq('group_id', groupId);

    if (error || !data) return 0;
    return data.reduce((sum, row) => sum + (row.file_size || 0), 0);
  },

  /**
   * Delete a gallery media file
   */
  async deleteImage(imageId: string, mediaUrl: string): Promise<void> {
    await deleteMediaFromStorage(BUCKET, mediaUrl);

    const { error } = await supabase
      .from('gallery_images')
      .delete()
      .eq('id', imageId);

    if (error) throw error;
  },
};
