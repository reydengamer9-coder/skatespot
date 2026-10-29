import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView } from 'react-native';

import { MediaView } from '@/components/MediaView';
import { ParkPicker } from '@/components/ParkPicker';
import { Body, Button, Input, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useUserId } from '@/lib/auth';
import { pickMedia, uploadMedia, type PickedMedia } from '@/lib/media';
import { supabase } from '@/lib/supabase';

export default function NewPostScreen() {
  const userId = useUserId();
  const params = useLocalSearchParams<{ parkId?: string }>();
  const [media, setMedia] = useState<PickedMedia | null>(null);
  const [caption, setCaption] = useState('');
  const [parkId, setParkId] = useState<string | null>(params.parkId ?? null);
  const [saving, setSaving] = useState(false);

  async function publish() {
    if (!media) return;
    setSaving(true);
    try {
      const media_url = await uploadMedia(userId, media);
      const { error } = await supabase
        .from('posts')
        .insert({ user_id: userId, park_id: parkId, caption, media_url, media_type: media.type });
      if (error) throw error;
      router.back();
    } catch (e) {
      Alert.alert('Error al subir', (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing, gap: 12, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
        {media ? <MediaView uri={media.uri} type={media.type} /> : <Body muted>Elige una foto o un video (máx. 60 s).</Body>}
        <Button
          variant="secondary"
          label={media ? 'Cambiar archivo' : 'Elegir foto o video'}
          onPress={async () => {
            const picked = await pickMedia();
            if (picked) setMedia(picked);
          }}
        />
        <Input placeholder="¿Qué truco es? Kickflip, 50-50…" value={caption} onChangeText={setCaption} />
        <Body muted>Skatepark (opcional)</Body>
        <ParkPicker value={parkId} onChange={setParkId} optional />
        <Button label="Publicar" onPress={publish} loading={saving} disabled={!media} />
      </ScrollView>
    </Screen>
  );
}
