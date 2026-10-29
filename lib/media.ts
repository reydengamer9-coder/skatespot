import * as ImagePicker from 'expo-image-picker';

import { supabase } from './supabase';
import type { MediaType } from './types';

export type PickedMedia = { uri: string; type: MediaType; mimeType: string };

/** Abre la galería para elegir una foto o un video (máx. 60 s). */
export async function pickMedia(kinds: ImagePicker.MediaType[] = ['images', 'videos']): Promise<PickedMedia | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: kinds,
    quality: 0.8,
    videoMaxDuration: 60,
  });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const type: MediaType = asset.type === 'video' ? 'video' : 'image';
  return {
    uri: asset.uri,
    type,
    mimeType: asset.mimeType ?? (type === 'video' ? 'video/mp4' : 'image/jpeg'),
  };
}

/** Sube el archivo al bucket "media" dentro de la carpeta del usuario y devuelve la URL pública. */
export async function uploadMedia(userId: string, media: PickedMedia): Promise<string> {
  const ext = media.mimeType.split('/')[1]?.replace('quicktime', 'mov') ?? 'bin';
  const path = `${userId}/${Date.now()}.${ext}`;
  const body = await (await fetch(media.uri)).arrayBuffer();

  const { error } = await supabase.storage.from('media').upload(path, body, { contentType: media.mimeType });
  if (error) throw error;

  return supabase.storage.from('media').getPublicUrl(path).data.publicUrl;
}
