import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { SectionList, StyleSheet, Text } from 'react-native';

import { CreateMenu } from '@/components/CreateMenu';
import { MeetupCard } from '@/components/MeetupCard';
import { Empty, Screen } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { fetchSessions } from '@/lib/sessions';
import type { Meetup } from '@/lib/types';

export default function SessionsScreen() {
  const [live, setLive] = useState<Meetup[]>([]);
  const [upcoming, setUpcoming] = useState<Meetup[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const s = await fetchSessions();
    setLive(s.live);
    setUpcoming(s.upcoming);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      const timer = setInterval(load, 60_000);
      return () => clearInterval(timer);
    }, [load]),
  );

  const sections = [
    ...(live.length ? [{ title: '● En vivo ahora', live: true, data: live }] : []),
    { title: 'Próximas sesiones', live: false, data: upcoming },
  ];

  return (
    <Screen>
      <SectionList
        sections={sections}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={load}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <Text style={[styles.header, section.live && { color: colors.live }]}>{section.title}</Text>
        )}
        renderSectionFooter={({ section }) =>
          section.data.length ? null : <Empty text="No hay sesiones próximas. ¡Arma una con el botón +!" />
        }
        renderItem={({ item }) => <MeetupCard meetup={item} />}
      />
      <CreateMenu />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing, gap: 12, paddingBottom: 100, maxWidth: 640, width: '100%', alignSelf: 'center' },
  header: { color: colors.text, fontSize: 18, fontWeight: '800', marginTop: 8 },
});
