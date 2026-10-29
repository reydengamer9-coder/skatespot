import { router } from 'expo-router';
import { useState } from 'react';
import { ScrollView } from 'react-native';

import { MediaView } from '@/components/MediaView';
import { Body, Button, Input, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useUserId } from '@/lib/auth';
import { useLocation } from '@/lib/location';
import { pickMedia, uploadMedia, type PickedMedia } from '@/lib/media';
import { supabase } from '@/lib/supabase';
import { showAlert } from '@/lib/alert';

export default function NewParkScreen() {
  const userId = useUserId();
  const { coords, error } = useLocation();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<PickedMedia | null>(null);
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!coords) return showAlert('Ubicación', 'Aún no tenemos tu ubicación.');
    if (!name.trim()) return showAlert('Falta el nombre');
    setSaving(true);
    try {
      const photo_url = photo ? await uploadMedia(userId, photo) : null;
      const { data, error } = await supabase
        .from('skateparks')
        .insert({ name: name.trim(), address, description, lat: coords.lat, lng: coords.lng, photo_url, created_by: userId })
        .select('id')
        .single();
      if (error) throw error;
      router.replace({ pathname: '/park/[id]', params: { id: data.id } });
    } catch (e) {
      showAlert('Error', (e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing, gap: 12 }}>
        <Body muted>
          {error ??
            (coords
              ? `Se guardará en tu ubicación actual (${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}). Párate en el parque al registrarlo.`
              : 'Obteniendo ubicación…')}
        </Body>
        <Input placeholder="Nombre del skatepark" value={name} onChangeText={setName} />
        <Input placeholder="Dirección o referencia" value={address} onChangeText={setAddress} />
        <Input
          placeholder="Descripción: bowls, rampas, rails, horario…"
          value={description}
          onChangeText={setDescription}
          multiline
          style={{ minHeight: 90, textAlignVertical: 'top' }}
        />
        {photo && <MediaView uri={photo.uri} type="image" />}
        <Button
          variant="secondary"
          label={photo ? 'Cambiar foto' : 'Agregar foto'}
          onPress={async () => setPhoto(await pickMedia(['images']))}
        />
        <Button label="Guardar skatepark" onPress={save} loading={saving} disabled={!coords} />
      </ScrollView>
    </Screen>
  );
}
