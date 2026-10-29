import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';

import { MEETUP_SELECT, MeetupCard } from '@/components/MeetupCard';
import { Empty, Icon, Screen } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { Meetup } from '@/lib/types';

export default function MeetupsScreen() {
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('meetups')
      .select(MEETUP_SELECT)
      .gte('starts_at', new Date().toISOString())
      .order('starts_at')
      .limit(50);
    setMeetups(data ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <Screen>
      <FlatList
        data={meetups}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={<Empty text="No hay encuentros próximos. ¡Arma una sesión!" />}
        renderItem={({ item }) => <MeetupCard meetup={item} />}
      />
      <Pressable style={styles.fab} onPress={() => router.push('/meetup/new')}>
        <Icon ios="calendar.badge.plus" material="add" color={colors.accentText} size={26} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing, gap: 12, paddingBottom: 100, maxWidth: 640, width: '100%', alignSelf: 'center' },
  fab: {
    position: 'absolute',
    right: spacing,
    bottom: spacing,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
