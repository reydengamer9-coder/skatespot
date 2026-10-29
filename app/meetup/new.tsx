import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ParkPicker } from '@/components/ParkPicker';
import { Body, Button, ChipGroup, Input, Screen } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { useUserId } from '@/lib/auth';
import { DURATIONS, SESSION_LEVELS, SESSION_TYPES, sessionTypeInfo } from '@/lib/sessions';
import { supabase } from '@/lib/supabase';
import type { SessionLevel, SessionType } from '@/lib/types';
import { showAlert } from '@/lib/alert';

type Mode = 'now' | 'later';
type Day = 'hoy' | 'manana' | 'otro';

const pad = (n: number) => String(n).padStart(2, '0');
const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const TIMES = ['10:00', '12:00', '16:00', '17:00', '18:00', '19:00'];

export default function NewSessionScreen() {
  const userId = useUserId();
  const params = useLocalSearchParams<{ parkId?: string; mode?: Mode }>();

  const [mode, setMode] = useState<Mode>(params.mode === 'now' ? 'now' : 'later');
  const [parkId, setParkId] = useState<string | null>(params.parkId ?? null);
  const [type, setType] = useState<SessionType>('street');
  const [level, setLevel] = useState<SessionLevel>('todos');
  const [duration, setDuration] = useState(120);
  const [day, setDay] = useState<Day>('hoy');
  const [customDate, setCustomDate] = useState(() => isoDate(new Date(Date.now() + 2 * 86400000)));
  const [time, setTime] = useState('17:00');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  function startDate(): Date {
    if (mode === 'now') return new Date();
    const base = day === 'hoy' ? isoDate(new Date()) : day === 'manana' ? isoDate(new Date(Date.now() + 86400000)) : customDate;
    return new Date(`${base}T${time}`);
  }

  async function save() {
    const startsAt = startDate();
    if (!parkId) return showAlert('Elige un skatepark');
    if (isNaN(startsAt.getTime())) return showAlert('Fecha u hora inválida', 'Usa AAAA-MM-DD y HH:MM');
    if (mode === 'later' && startsAt < new Date()) return showAlert('Esa hora ya pasó', 'Elige una hora futura.');

    setSaving(true);
    const { data, error } = await supabase
      .from('meetups')
      .insert({
        park_id: parkId,
        title: title.trim() || `Sesión de ${sessionTypeInfo(type).label}`,
        description,
        starts_at: startsAt.toISOString(),
        duration_minutes: duration,
        session_type: type,
        level,
        created_by: userId,
      })
      .select('id')
      .single();
    // Quien crea la sesión queda apuntado automáticamente
    if (!error) await supabase.from('meetup_attendees').insert({ meetup_id: data.id, user_id: userId });
    setSaving(false);
    if (error) return showAlert('Error', error.message);
    router.back();
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: mode === 'now' ? 'Sesión en vivo' : 'Programar sesión' }} />
      <ScrollView contentContainerStyle={styles.content}>
        <Section label="¿Cuándo?">
          <ChipGroup
            options={[
              { value: 'now', label: '🔴 Ahora mismo' },
              { value: 'later', label: '📅 Programar' },
            ]}
            value={mode}
            onChange={setMode}
          />
        </Section>

        <Section label="¿Dónde?">
          <ParkPicker value={parkId} onChange={setParkId} />
        </Section>

        <Section label="Tipo de sesión">
          <ChipGroup
            options={SESSION_TYPES.map((t) => ({ value: t.value, label: `${t.emoji} ${t.label}` }))}
            value={type}
            onChange={setType}
          />
        </Section>

        <Section label="Nivel">
          <ChipGroup options={SESSION_LEVELS} value={level} onChange={setLevel} />
        </Section>

        {mode === 'later' && (
          <>
            <Section label="Día">
              <ChipGroup
                options={[
                  { value: 'hoy', label: 'Hoy' },
                  { value: 'manana', label: 'Mañana' },
                  { value: 'otro', label: 'Otro día' },
                ]}
                value={day}
                onChange={setDay}
              />
              {day === 'otro' && <Input placeholder="AAAA-MM-DD" value={customDate} onChangeText={setCustomDate} />}
            </Section>

            <Section label="Hora">
              <ChipGroup
                options={TIMES.map((t) => ({ value: t, label: t }))}
                value={TIMES.includes(time) ? time : ''}
                onChange={setTime}
              />
              <Input placeholder="Otra hora (HH:MM)" value={TIMES.includes(time) ? '' : time} onChangeText={setTime} />
            </Section>
          </>
        )}

        <Section label="Duración">
          <ChipGroup options={DURATIONS.map((d) => ({ value: d, label: `${d / 60} h` }))} value={duration} onChange={setDuration} />
        </Section>

        <Section label="Detalles (opcional)">
          <Input placeholder={`Título (por defecto: Sesión de ${sessionTypeInfo(type).label})`} value={title} onChangeText={setTitle} />
          <Input
            placeholder="Qué llevar, punto de encuentro…"
            value={description}
            onChangeText={setDescription}
            multiline
            style={{ minHeight: 70, textAlignVertical: 'top' }}
          />
        </Section>

        <Button label={mode === 'now' ? '🔴 Empezar sesión en vivo' : 'Crear sesión'} onPress={save} loading={saving} />
        {mode === 'now' && <Body muted>Aparecerá en la burbuja «En vivo» del mapa para que otros skaters se unan.</Body>}
      </ScrollView>
    </Screen>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing, gap: 18, paddingBottom: 40, maxWidth: 640, width: '100%', alignSelf: 'center' },
  label: { color: colors.muted, fontWeight: '700', textTransform: 'uppercase', fontSize: 12, letterSpacing: 1 },
});
