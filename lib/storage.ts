/**
 * Utilidades de Supabase Storage
 * Subida y borrado de medios compartidos en buckets del TFG Closed.
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
  fileSize: number;
}

interface UploadOptions {
  bucket: string;
  folder: string;
  uri: string;
  fileName?: string;
  contentType?: string;
}

/** Optimizado para archivos grandes (vídeos) y evitar OOM en nativo. */
export async function uploadMediaToStorage(options: UploadOptions): Promise<UploadResult> {
  const { bucket, folder, uri, fileName, contentType: contentTypeOverride } = options;

  const FileSystem = await import('expo-file-system/legacy');

  const extension = uri.split('.').pop()?.toLowerCase() || 'jpg';
  const finalName = fileName || `${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
  const storagePath = `${folder}/${finalName}`;

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

  const fileInfo = await FileSystem.getInfoAsync(uri);
  const fileSize = fileInfo.exists ? fileInfo.size : 0;

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
      } catch {
        // El cuerpo de error no es JSON
      }

      throw new StorageError(errorMessage, errorCode);
    }
  }

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(storagePath);

  return {
    publicUrl: data.publicUrl,
    storagePath,
    fileSize,
  };
}

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

// Activar solo con plan Pro+ que soporte transformaciones de imagen en Supabase.
const ENABLE_IMAGE_OPTIMIZATION = false;

export function getOptimizedMediaUrl(
  url: string | null | undefined,
  options: { width?: number; height?: number; resize?: 'cover' | 'contain' | 'fill' } = {}
): string | undefined {
  if (!url) return undefined;
  
  if (!ENABLE_IMAGE_OPTIMIZATION) {
    return url;
  }

  if (url.includes('/object/public/') && url.includes('supabase.co')) {
    const isVideo = url.toLowerCase().match(/\.(mp4|mov|webm|m4v)$/);
    if (isVideo) return url;

    let optimizedUrl = url.replace('/object/public/', '/render/image/public/');
    
    const params: string[] = [];
    if (options.width) params.push(`width=${options.width}`);
    if (options.height) params.push(`height=${options.height}`);
    if (options.resize) params.push(`resize=${options.resize}`);
    params.push('format=webp');
    params.push('quality=80');

    if (params.length > 0) {
      const queryString = params.join('&');
      optimizedUrl += url.includes('?') ? `&${queryString}` : `?${queryString}`;
    }
    
    return optimizedUrl;
  }
  
  return url;
}
