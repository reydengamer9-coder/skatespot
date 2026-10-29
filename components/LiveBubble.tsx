import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { useUserId } from '@/lib/auth';
import { minutesLeft, sessionTypeInfo, toggleAttendance } from '@/lib/sessions';
import type { Meetup } from '@/lib/types';
import { showAlert } from '@/lib/alert';

/** Burbuja flotante con las sesiones que están pasando ahora mismo. */
export function LiveBubble({ sessions, onSelectPark }: { sessions: Meetup[]; onSelectPark: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const count = sessions.length;

  if (!count) {
    return (
      <Pressable
        style={[styles.pill, { borderColor: colors.border }]}
        onPress={() => router.push({ pathname: '/meetup/new', params: { mode: 'now' } })}>
        <Text style={styles.pillText}>Nadie patinando ahora · </Text>
        <Text style={[styles.pillText, { color: colors.accent }]}>Empieza una sesión</Text>
      </Pressable>
    );
  }

  return (
    <View style={{ alignItems: 'center', width: '100%' }}>
      <Pressable style={styles.pill} onPress={() => setOpen(!open)}>
        <View style={styles.dot} />
        <Text style={styles.pillText}>
          {count} {count === 1 ? 'sesión' : 'sesiones'} en vivo
        </Text>
        <Text style={[styles.pillText, { color: colors.muted }]}>{open ? '▲' : '▼'}</Text>
      </Pressable>

      {open && (
        <ScrollView style={styles.panel} contentContainerStyle={{ gap: 8 }}>
          {sessions.map((s) => (
            <LiveRow
              key={s.id}
              session={s}
              onPress={() => {
                setOpen(false);
                onSelectPark(s.park_id);
              }}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function LiveRow({ session, onPress }: { session: Meetup; onPress: () => void }) {
  const userId = useUserId();
  const [attendees, setAttendees] = useState(session.meetup_attendees?.map((a) => a.user_id) ?? []);
  const [busy, setBusy] = useState(false);
  const going = attendees.includes(userId);
  const type = sessionTypeInfo(session.session_type);

  async function join() {
    setBusy(true);
    try {
      setAttendees(await toggleAttendance(session, userId, attendees));
    } catch (e) {
      showAlert('Error', (e as Error).message);
    }
    setBusy(false);
  }

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <Text style={{ fontSize: 24 }}>{type.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {session.title}
        </Text>
        <Text style={styles.rowSub} numberOfLines={1}>
          📍 {session.skateparks?.name} · {attendees.length} {attendees.length === 1 ? 'skater' : 'skaters'} · quedan{' '}
          {minutesLeft(session)} min
        </Text>
      </View>
      <Pressable
        onPress={join}
        disabled={busy}
        style={[styles.join, going && { backgroundColor: 'transparent', borderColor: colors.border }, busy && { opacity: 0.5 }]}>
        <Text style={{ color: going ? colors.text : colors.accentText, fontWeight: '800' }}>
          {going ? 'Dentro ✓' : 'Unirse'}
        </Text>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    borderColor: colors.live,
    borderWidth: 1.5,
    borderRadius: 99,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  pillText: { color: colors.text, fontWeight: '700' },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.live },
  panel: {
    marginTop: 8,
    maxHeight: 320,
    width: '100%',
    maxWidth: 520,
    backgroundColor: colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 10,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 6 },
  rowTitle: { color: colors.text, fontWeight: '700', fontSize: 15 },
  rowSub: { color: colors.muted, fontSize: 12 },
  join: {
    backgroundColor: colors.live,
    borderWidth: 1,
    borderColor: colors.live,
    borderRadius: 99,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
});
