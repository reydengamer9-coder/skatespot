import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';

import { ParkPicker } from '@/components/ParkPicker';
import { Body, Button, Input, Screen } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useUserId } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

const pad = (n: number) => String(n).padStart(2, '0');

export default function NewMeetupScreen() {
  const userId = useUserId();
  const params = useLocalSearchParams<{ parkId?: string }>();
  const tomorrow = new Date(Date.now() + 86400000);

  const [parkId, setParkId] = useState<string | null>(params.parkId ?? null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(`${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`);
  const [time, setTime] = useState('17:00');
  const [saving, setSaving] = useState(false);

  async function save() {
    const startsAt = new Date(`${date}T${time}`);
    if (!parkId) return Alert.alert('Elige un skatepark');
    if (!title.trim()) return Alert.alert('Ponle un título');
    if (isNaN(startsAt.getTime())) return Alert.alert('Fecha u hora inválida', 'Usa AAAA-MM-DD y HH:MM');
    if (startsAt < new Date()) return Alert.alert('La fecha debe ser futura');

    setSaving(true);
    const { data, error } = await supabase
      .from('meetups')
      .insert({ park_id: parkId, title: title.trim(), description, starts_at: startsAt.toISOString(), created_by: userId })
      .select('id')
      .single();
    if (!error) await supabase.from('meetup_attendees').insert({ meetup_id: data.id, user_id: userId });
    setSaving(false);
    if (error) return Alert.alert('Error', error.message);
    router.back();
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: spacing, gap: 12 }}>
        <Body muted>¿Dónde?</Body>
        <ParkPicker value={parkId} onChange={setParkId} />
        <Input placeholder="Título (ej. Sesión de bowl)" value={title} onChangeText={setTitle} />
        <Input
          placeholder="Detalles: nivel, qué llevar…"
          value={description}
          onChangeText={setDescription}
          multiline
          style={{ minHeight: 80, textAlignVertical: 'top' }}
        />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Input style={{ flex: 2 }} placeholder="AAAA-MM-DD" value={date} onChangeText={setDate} />
          <Input style={{ flex: 1 }} placeholder="HH:MM" value={time} onChangeText={setTime} />
        </View>
        <Button label="Crear encuentro" onPress={save} loading={saving} />
      </ScrollView>
    </Screen>
  );
}
