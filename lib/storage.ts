/**
 * Shared storage utility for uploading media to Supabase Storage.
 * All widget services should use this instead of implementing their own upload logic.
 */
import { Platform } from 'react-native';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '../lib/supabase';

export class StorageError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = 'StorageError';
  }
}

interface UploadResult {
  publicUrl: string;
  storagePath: string;
  /** File size in bytes */
  fileSize: number;
}

interface UploadOptions {
  /** The Supabase storage bucket name */
  bucket: string;
  /** A prefix path within the bucket (e.g., groupId) */
  folder: string;
  /** The local file URI to upload */
  uri: string;
  /** Optional custom file name (auto-generated if omitted) */
  fileName?: string;
  /** Optional content type override */
  contentType?: string;
}

/**
 * Upload a file from a local URI to Supabase Storage.
 * Optimized for large files (videos) to avoid OutOfMemory errors on Native.
 */
export async function uploadMediaToStorage(options: UploadOptions): Promise<UploadResult> {
  const { bucket, folder, uri, fileName, contentType: contentTypeOverride } = options;

  // Dynamic import for FileSystem
  const FileSystem = await import('expo-file-system/legacy');

  const extension = uri.split('.').pop()?.toLowerCase() || 'jpg';
  const finalName = fileName || `${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
  const storagePath = `${folder}/${finalName}`;

  // Determine content type
  let contentType = contentTypeOverride;
  if (!contentType) {
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(extension)) {
      contentType = `image/${extension === 'jpg' ? 'jpeg' : extension}`;
    } else if (['mp4', 'mov', 'quicktime', 'm4v'].includes(extension)) {
      contentType = `video/${extension === 'mov' ? 'quicktime' : (extension === 'm4v' ? 'x-m4v' : 'mp4')}`;
    } else {
      contentType = 'application/octet-stream';
    }
  }

  // Get file info for size check
  const fileInfo = await FileSystem.getInfoAsync(uri);
  const fileSize = fileInfo.exists ? fileInfo.size : 0;

  // Client-side size limit check (e.g., 100MB as a sane default for our app)
  // Note: Supabase bucket might have its own limit (often 50MB by default)
  if (fileSize > 100 * 1024 * 1024) {
    throw new StorageError('El archivo es demasiado grande (máximo 100MB)', 'FILE_TOO_LARGE');
  }

  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    const blob = await response.blob();
    
    const { error } = await supabase.storage
      .from(bucket)
      .upload(storagePath, blob, {
        contentType,
        upsert: false,
      });

    if (error) {
      if ((error as any).status === 413 || error.message.includes('too large')) {
        throw new StorageError('El servidor rechaza el archivo por ser demasiado grande.', 'PAYLOAD_TOO_LARGE');
      }
      throw error;
    }
  } else {
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${bucket}/${storagePath}`;
    
    // Get current session for authentication
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || SUPABASE_ANON_KEY;

    const result = await FileSystem.uploadAsync(uploadUrl, uri, {
      httpMethod: 'POST',
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': contentType,
      },
    });

    if (result.status < 200 || result.status >= 300) {
      let errorMessage = 'Error al subir el archivo';
      let errorCode = 'UPLOAD_FAILED';

      try {
        const body = JSON.parse(result.body);
        if (result.status === 413 || body.statusCode === '413' || body.error === 'Payload too large') {
          errorMessage = 'El vídeo es demasiado grande para el servidor (Límite: 50MB-100MB)';
          errorCode = 'PAYLOAD_TOO_LARGE';
        } else if (result.status === 403 || body.statusCode === '403' || body.message?.includes('RLS')) {
          errorMessage = 'No tienes permiso para subir archivos a este grupo.';
          errorCode = 'UNAUTHORIZED';
        } else {
          errorMessage = body.message || errorMessage;
        }
      } catch (e) {
        // Fallback if body is not JSON
      }

      throw new StorageError(errorMessage, errorCode);
    }
  }

  // Public URL
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(storagePath);

  return {
    publicUrl: data.publicUrl,
    storagePath,
    fileSize,
  };
}

/**
 * Legacy alias for uploadMediaToStorage
 */
export const uploadImageToStorage = uploadMediaToStorage;

/**
 * Delete a file from Supabase Storage by its public URL.
 */
export async function deleteMediaFromStorage(
  bucket: string,
  publicUrl: string
): Promise<void> {
  const marker = `/storage/v1/object/public/${bucket}/`;
  const parts = publicUrl.split(marker);
  if (parts.length === 2) {
    await supabase.storage.from(bucket).remove([parts[1]]);
  }
}

/**
 * Legacy alias for deleteMediaFromStorage
 */
export const deleteImageFromStorage = deleteMediaFromStorage;
