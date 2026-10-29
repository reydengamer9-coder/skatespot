import { Image } from 'expo-image';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';

import { MeetupCard } from '@/components/MeetupCard';
import { POST_SELECT, PostCard } from '@/components/PostCard';
import { Body, Button, Empty, Loading, Screen, Title } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { mapsUrl } from '@/lib/format';
import { fetchSessions } from '@/lib/sessions';
import { supabase } from '@/lib/supabase';
import type { Meetup, Post, Skatepark } from '@/lib/types';

export default function ParkScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [park, setPark] = useState<Skatepark | null>(null);
  const [meetups, setMeetups] = useState<Meetup[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [p, m, po] = await Promise.all([
          supabase.from('skateparks').select('*').eq('id', id).single(),
          fetchSessions(id),
          supabase.from('posts').select(POST_SELECT).eq('park_id', id).order('created_at', { ascending: false }).limit(20),
        ]);
        setPark(p.data);
        setMeetups([...m.live, ...m.upcoming]);
        setPosts(po.data ?? []);
      })();
    }, [id]),
  );

  if (!park) return <Loading />;

  return (
    <Screen>
      <Stack.Screen options={{ title: park.name }} />
      <ScrollView contentContainerStyle={{ padding: spacing, gap: 12, maxWidth: 720, width: '100%', alignSelf: 'center' }}>
        {park.photo_url && (
          <Image source={{ uri: park.photo_url }} style={{ width: '100%', aspectRatio: 16 / 9, borderRadius: 14 }} />
        )}
        <Title>{park.name}</Title>
        {!!park.address && <Body muted>{park.address}</Body>}
        {!!park.description && <Body>{park.description}</Body>}
        {!!park.osm_id && (
          <Text style={{ color: colors.muted, fontSize: 12 }} onPress={() => Linking.openURL(`https://www.openstreetmap.org/${park.osm_id}`)}>
            Datos © colaboradores de OpenStreetMap
          </Text>
        )}

        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button label="Cómo llegar" variant="secondary" onPress={() => Linking.openURL(mapsUrl(park.lat, park.lng))} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="Chat del parque"
              onPress={() => router.push({ pathname: '/chat/[room]', params: { room: park.id, name: park.name } })}
            />
          </View>
        </View>

        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          <Title>Sesiones</Title>
        </View>
        {meetups.length ? meetups.map((m) => <MeetupCard key={m.id} meetup={m} />) : <Empty text="No hay sesiones en este parque." />}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Button
              label="🔴 Sesión ahora"
              onPress={() => router.push({ pathname: '/meetup/new', params: { mode: 'now', parkId: park.id } })}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="📅 Programar"
              variant="secondary"
              onPress={() => router.push({ pathname: '/meetup/new', params: { mode: 'later', parkId: park.id } })}
            />
          </View>
        </View>

        <View style={{ marginTop: 12 }}>
          <Title>Trucos en este parque</Title>
        </View>
        {posts.length ? posts.map((p) => <PostCard key={p.id} post={p} />) : <Empty text="Sé el primero en subir un truco." />}
        <Button
          label="Subir truco aquí"
          onPress={() => router.push({ pathname: '/post/new', params: { parkId: park.id } })}
        />
      </ScrollView>
    </Screen>
  );
}
