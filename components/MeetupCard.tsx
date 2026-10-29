import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Body, Button, Card, Title } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useUserId } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { isLive, levelLabel, minutesLeft, sessionTypeInfo, toggleAttendance } from '@/lib/sessions';
import type { Meetup } from '@/lib/types';
import { showAlert } from '@/lib/alert';

export function MeetupCard({ meetup, compact }: { meetup: Meetup; compact?: boolean }) {
  const userId = useUserId();
  const [attendees, setAttendees] = useState(meetup.meetup_attendees?.map((a) => a.user_id) ?? []);
  const [busy, setBusy] = useState(false);
  const going = attendees.includes(userId);
  const live = isLive(meetup);
  const type = sessionTypeInfo(meetup.session_type);

  async function toggle() {
    setBusy(true);
    try {
      setAttendees(await toggleAttendance(meetup, userId, attendees));
    } catch (e) {
      showAlert('Error', (e as Error).message);
    }
    setBusy(false);
  }

  return (
    <Card>
      <View style={styles.top}>
        {live ? (
          <Text style={styles.live}>● EN VIVO · {minutesLeft(meetup)} min</Text>
        ) : (
          <Text style={styles.date}>{formatDateTime(meetup.starts_at)}</Text>
        )}
        <Text style={styles.tag}>
          {type.emoji} {type.label}
        </Text>
      </View>
      <Title>{meetup.title}</Title>
      <Body muted>
        📍 {meetup.skateparks?.name ?? 'Skatepark'} · {levelLabel(meetup.level)} · {meetup.duration_minutes / 60} h
      </Body>
      {!compact && !!meetup.description && <Body>{meetup.description}</Body>}
      <View style={styles.footer}>
        <Body muted>
          {attendees.length} {attendees.length === 1 ? 'va' : 'van'} · por @{meetup.profiles?.username ?? 'skater'}
        </Body>
        <View style={{ minWidth: 120 }}>
          <Button
            label={going ? 'Salir' : live ? 'Unirse ya' : 'Me apunto'}
            variant={going ? 'secondary' : 'primary'}
            onPress={toggle}
            loading={busy}
          />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  date: { color: colors.accent, fontWeight: '700', textTransform: 'capitalize' },
  live: { color: colors.live, fontWeight: '800' },
  tag: { color: colors.muted, fontSize: 13 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6, gap: 8 },
});
