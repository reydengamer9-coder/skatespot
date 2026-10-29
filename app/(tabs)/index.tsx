import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { CreateMenu } from '@/components/CreateMenu';
import { LiveBubble } from '@/components/LiveBubble';
import { MeetupCard } from '@/components/MeetupCard';
import { ParkMap } from '@/components/ParkMap';
import { Body, Button, Card, Chip, Empty, Screen, Title } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { useUserId } from '@/lib/auth';
import { formatDistance } from '@/lib/format';
import { useLocation } from '@/lib/location';
import type { MapData } from '@/lib/mapHtml';
import { importNearbySkateparks } from '@/lib/osm';
import { fetchSessions } from '@/lib/sessions';
import { supabase } from '@/lib/supabase';
import type { Meetup, Skatepark } from '@/lib/types';

const RADII = [5, 25, 100];
const REFRESH_MS = 60_000;

export default function ParksScreen() {
  const userId = useUserId();
  const { coords, error, refresh } = useLocation();
  const [view, setView] = useState<'map' | 'list'>('map');
  const [radius, setRadius] = useState(25);
  const [parks, setParks] = useState<Skatepark[]>([]);
  const [live, setLive] = useState<Meetup[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    // Sin ubicación mostramos todos los parques; con ubicación, los del radio elegido.
    const fetchParks = async () => {
      const { data } = coords
        ? await supabase.rpc('nearby_skateparks', { user_lat: coords.lat, user_lng: coords.lng, radius_km: radius })
        : await supabase.from('skateparks').select('*').limit(200);
      return (data as Skatepark[]) ?? [];
    };
    const [list, sessions] = await Promise.all([fetchParks(), fetchSessions()]);
    setParks(list);
    setLive(sessions.live);
    setLoading(false);

    // Completa el mapa con los skateparks de OpenStreetMap de la zona (una vez por zona)
    if (coords) {
      setImporting(true);
      const added = await importNearbySkateparks(coords, radius, userId, list);
      setImporting(false);
      if (added) setParks(await fetchParks());
    }
  }, [coords, radius, userId]);

  // Recarga al volver a la pestaña y cada minuto mientras está abierta (sesiones en vivo).
  useFocusEffect(
    useCallback(() => {
      load();
      const timer = setInterval(load, REFRESH_MS);
      return () => clearInterval(timer);
    }, [load]),
  );

  const liveByPark = useMemo(() => {
    const map = new Map<string, Meetup[]>();
    live.forEach((m) => map.set(m.park_id, [...(map.get(m.park_id) ?? []), m]));
    return map;
  }, [live]);

  const mapData = useMemo<MapData>(
    () => ({
      parks: parks.map((p) => ({ id: p.id, name: p.name, lat: p.lat, lng: p.lng, live: liveByPark.get(p.id)?.length ?? 0 })),
      user: coords,
      selectedId,
    }),
    [parks, liveByPark, coords, selectedId],
  );

  const selected = parks.find((p) => p.id === selectedId) ?? null;

  return (
    <Screen>
      {view === 'map' ? (
        <View style={{ flex: 1 }}>
          <ParkMap data={mapData} onSelect={setSelectedId} />
          {selected && <ParkSheet park={selected} sessions={liveByPark.get(selected.id) ?? []} onClose={() => setSelectedId(null)} />}
        </View>
      ) : (
        <FlatList
          data={parks}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: spacing, paddingTop: 130, gap: 12, paddingBottom: 100 }}
          refreshing={loading}
          onRefresh={load}
          ListEmptyComponent={<Empty text="No hay skateparks registrados cerca. ¡Agrega el primero!" />}
          renderItem={({ item }) => {
            const n = liveByPark.get(item.id)?.length ?? 0;
            return (
              <Link href={{ pathname: '/park/[id]', params: { id: item.id } }} asChild>
                <Pressable>
                  <Card>
                    <View style={styles.row}>
                      <Title>{item.name}</Title>
                      <Text style={styles.distance}>{formatDistance(item.distance_km)}</Text>
                    </View>
                    {!!item.address && <Body muted>{item.address}</Body>}
                    {n > 0 && <Text style={styles.liveText}>● {n} en vivo ahora</Text>}
                  </Card>
                </Pressable>
              </Link>
            );
          }}
        />
      )}

      {/* Controles flotantes superiores */}
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.controls}>
          <View style={styles.segment}>
            <Chip label="🗺️ Mapa" active={view === 'map'} onPress={() => setView('map')} />
            <Chip label="☰ Lista" active={view === 'list'} onPress={() => setView('list')} />
          </View>
          {coords && (
            <View style={styles.segment}>
              {RADII.map((r) => (
                <Chip key={r} label={`${r} km`} active={radius === r} onPress={() => setRadius(r)} />
              ))}
            </View>
          )}
        </View>
        <LiveBubble
          sessions={live}
          onSelectPark={(id) => {
            setView('map');
            setSelectedId(id);
          }}
        />
        {importing && <Text style={styles.importing}>Buscando skateparks en OpenStreetMap…</Text>}
        {error && (
          <Pressable onPress={refresh} style={styles.warning}>
            <Text style={{ color: colors.text, fontSize: 13 }}>{error} Toca para reintentar.</Text>
          </Pressable>
        )}
      </View>

      {!selected && <CreateMenu />}
    </Screen>
  );
}

/** Tarjeta inferior con el parque seleccionado en el mapa. */
function ParkSheet({ park, sessions, onClose }: { park: Skatepark; sessions: Meetup[]; onClose: () => void }) {
  return (
    <View style={styles.sheet}>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Title>{park.name}</Title>
          {!!park.address && <Body muted>{park.address}</Body>}
        </View>
        <Text style={styles.distance}>{formatDistance(park.distance_km)}</Text>
        <Pressable onPress={onClose} hitSlop={12}>
          <Text style={{ color: colors.muted, fontSize: 20 }}>✕</Text>
        </Pressable>
      </View>

      {sessions.map((s) => (
        <MeetupCard key={s.id} meetup={s} compact />
      ))}

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View style={{ flex: 1 }}>
          <Button
            label="Ver parque"
            variant="secondary"
            onPress={() => router.push({ pathname: '/park/[id]', params: { id: park.id } })}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            label="Sesión aquí"
            onPress={() => router.push({ pathname: '/meetup/new', params: { mode: 'now', parkId: park.id } })}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, padding: spacing, gap: 10, alignItems: 'center' },
  controls: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  segment: {
    flexDirection: 'row',
    gap: 4,
    backgroundColor: colors.bg,
    borderRadius: 99,
    padding: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  importing: {
    color: colors.text,
    fontSize: 12,
    backgroundColor: colors.card,
    borderRadius: 99,
    paddingHorizontal: 12,
    paddingVertical: 6,
    overflow: 'hidden',
  },
  warning: { backgroundColor: colors.card, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: colors.danger },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  distance: { color: colors.accent, fontWeight: '700' },
  liveText: { color: colors.live, fontWeight: '700' },
  sheet: {
    position: 'absolute',
    left: spacing,
    right: spacing,
    bottom: spacing,
    maxWidth: 560,
    marginHorizontal: 'auto',
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing,
    gap: 10,
  },
});
