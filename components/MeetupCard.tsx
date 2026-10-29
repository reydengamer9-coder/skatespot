import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Body, Button, Card, Title } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useUserId } from '@/lib/auth';
import { formatDateTime } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Meetup } from '@/lib/types';

export const MEETUP_SELECT = '*, skateparks(name), profiles(username), meetup_attendees(user_id)';

export function MeetupCard({ meetup }: { meetup: Meetup }) {
  const userId = useUserId();
  const [attendees, setAttendees] = useState(meetup.meetup_attendees?.map((a) => a.user_id) ?? []);
  const [busy, setBusy] = useState(false);
  const going = attendees.includes(userId);

  async function toggle() {
    setBusy(true);
    const { error } = going
      ? await supabase.from('meetup_attendees').delete().match({ meetup_id: meetup.id, user_id: userId })
      : await supabase.from('meetup_attendees').insert({ meetup_id: meetup.id, user_id: userId });
    if (!error) setAttendees(going ? attendees.filter((id) => id !== userId) : [...attendees, userId]);
    setBusy(false);
  }

  return (
    <Card>
      <Text style={styles.date}>{formatDateTime(meetup.starts_at)}</Text>
      <Title>{meetup.title}</Title>
      <Body muted>
        📍 {meetup.skateparks?.name ?? 'Skatepark'} · por @{meetup.profiles?.username ?? 'skater'}
      </Body>
      {!!meetup.description && <Body>{meetup.description}</Body>}
      <View style={styles.footer}>
        <Body muted>
          {attendees.length} {attendees.length === 1 ? 'va' : 'van'}
        </Body>
        <View style={{ minWidth: 120 }}>
          <Button label={going ? 'Ya no voy' : 'Me apunto'} variant={going ? 'secondary' : 'primary'} onPress={toggle} loading={busy} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  date: { color: colors.accent, fontWeight: '700', textTransform: 'capitalize' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
});
