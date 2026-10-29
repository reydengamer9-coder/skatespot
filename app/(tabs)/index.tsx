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
import { distanceKm, type Bounds } from '@/lib/geo';
import type { MapData, MapEvent } from '@/lib/mapHtml';
import { importNearbySkateparks, importSkateparksInBounds } from '@/lib/osm';
import { fetchSessions } from '@/lib/sessions';
import { supabase } from '@/lib/supabase';
import type { Meetup, Skatepark } from '@/lib/types';

const RADII = [10, 50, 200];
const REFRESH_MS = 60_000;
const IMPORT_MIN_ZOOM = 8; // con menos zoom la zona visible es demasiado grande para importar de OSM
const PARK_COLUMNS = 'id, name, description, address, lat, lng, photo_url, osm_id';

const wrapLng = (x: number) => ((((x + 180) % 360) + 360) % 360) - 180;

/** Si la zona ya tiene parques de OpenStreetMap, ya se importó (p. ej. con la importación masiva). */
const alreadyImported = (list: Skatepark[]) => list.some((p) => p.osm_id);

const PAGE = 1000; // Supabase devuelve como máximo 1000 filas por consulta
const MAX_PAGES = 15; // hasta 15 000 parques por zona visible (EE. UU. entero cabe)

/** Parques dentro de la zona visible del mapa, pidiendo varias páginas en paralelo. */
async function fetchParksInBounds(b: Bounds) {
  const page = async (i: number) => {
    let q = supabase
      .from('skateparks')
      .select(PARK_COLUMNS)
      .gte('lat', b.south)
      .lte('lat', b.north)
      .order('id')
      .range(i * PAGE, i * PAGE + PAGE - 1);
    if (b.east - b.west < 360) {
      const w = wrapLng(b.west);
      const e = wrapLng(b.east);
      // Si la zona cruza el antimeridiano (w > e) se piden los dos lados
      q = w <= e ? q.gte('lng', w).lte('lng', e) : q.or(`lng.gte.${w},lng.lte.${e}`);
    }
    const { data } = await q;
    return (data as Skatepark[]) ?? [];
  };

  const all = await page(0);
  // Si la primera página vino llena, pide el resto de golpe (de 4 en 4)
  for (let i = 1; all.length === i * PAGE && i < MAX_PAGES; i += 4) {
    const more = await Promise.all([i, i + 1, i + 2, i + 3].filter((n) => n < MAX_PAGES).map(page));
    more.forEach((m) => all.push(...m));
    if (more.some((m) => m.length < PAGE)) break;
  }
  return all;
}

export default function ParksScreen() {
  const userId = useUserId();
  const { coords, error, refresh } = useLocation();
  const [view, setView] = useState<'map' | 'list'>('map');
  const [radius, setRadius] = useState(50);
  const [listParks, setListParks] = useState<Skatepark[]>([]);
  // Todos los parques que se han cargado en el mapa (se van acumulando al moverse)
  const [mapParks, setMapParks] = useState<Record<string, Skatepark>>({});
  const [live, setLive] = useState<Meetup[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(0);

  const mergeParks = useCallback((list: Skatepark[]) => {
    if (list.length) setMapParks((prev) => ({ ...prev, ...Object.fromEntries(list.map((p) => [p.id, p])) }));
  }, []);

  const runImport = useCallback(async (job: () => Promise<number>) => {
    setImporting((n) => n + 1);
    const added = await job();
    setImporting((n) => n - 1);
    return added;
  }, []);

  /** Lista por radio + sesiones en vivo (se refresca cada minuto). */
  const load = useCallback(async () => {
    setLoading(true);
    const fetchNearby = async () => {
      if (!coords) return [];
      const { data } = await supabase.rpc('nearby_skateparks', {
        user_lat: coords.lat,
        user_lng: coords.lng,
        radius_km: radius,
      });
      return (data as Skatepark[]) ?? [];
    };
    const [list, sessions] = await Promise.all([fetchNearby(), fetchSessions()]);
    setListParks(list);
    mergeParks(list);
    setLive(sessions.live);
    setLoading(false);

    // Completa la lista con los skateparks de OpenStreetMap alrededor del usuario (una vez por zona)
    if (coords && !alreadyImported(list) && (await runImport(() => importNearbySkateparks(coords, radius, userId, list)))) {
      const again = await fetchNearby();
      setListParks(again);
      mergeParks(again);
    }
  }, [coords, radius, userId, mergeParks, runImport]);

  /** El mapa se movió: carga los parques de la zona visible e importa los de OpenStreetMap. */
  const onBounds = useCallback(
    async (b: Bounds, zoom: number) => {
      const list = await fetchParksInBounds(b);
      mergeParks(list);
      if (zoom >= IMPORT_MIN_ZOOM && !alreadyImported(list) && (await runImport(() => importSkateparksInBounds(b, userId, list)))) {
        mergeParks(await fetchParksInBounds(b));
      }
    },
    [userId, mergeParks, runImport],
  );

  const onMapEvent = useCallback(
    (e: MapEvent) => {
      if (e.type === 'select') setSelectedId(e.id);
      else if (e.type === 'bounds') onBounds(e.bounds, e.zoom);
    },
    [onBounds],
  );

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

  const mapData = useMemo<MapData>(() => {
    const points = new Map(
      Object.values(mapParks).map((p) => [p.id, { id: p.id, lat: p.lat, lng: p.lng, live: liveByPark.get(p.id)?.length ?? 0 }]),
    );
    // Los parques con sesión en vivo siempre aparecen, aunque aún no se haya cargado su zona
    live.forEach((m) => {
      if (!points.has(m.park_id) && m.skateparks) {
        points.set(m.park_id, { id: m.park_id, lat: m.skateparks.lat, lng: m.skateparks.lng, live: liveByPark.get(m.park_id)!.length });
      }
    });
    return { parks: [...points.values()], user: coords, selectedId };
  }, [mapParks, live, liveByPark, coords, selectedId]);

  const selected = useMemo<Skatepark | null>(() => {
    if (!selectedId) return null;
    if (mapParks[selectedId]) return mapParks[selectedId];
    // Parque elegido desde la burbuja en vivo cuya zona aún no se cargó en el mapa
    const p = live.find((m) => m.park_id === selectedId)?.skateparks;
    return p ? { id: selectedId, name: p.name, lat: p.lat, lng: p.lng, description: null, address: null, photo_url: null } : null;
  }, [selectedId, mapParks, live]);
  const withDistance = (p: Skatepark) =>
    coords && p.distance_km == null ? { ...p, distance_km: distanceKm(coords, p) } : p;

  return (
    <Screen>
      {view === 'map' ? (
        <View style={{ flex: 1 }}>
          <ParkMap data={mapData} onEvent={onMapEvent} />
          {selected && (
            <ParkSheet
              park={withDistance(selected)}
              sessions={liveByPark.get(selected.id) ?? []}
              onClose={() => setSelectedId(null)}
            />
          )}
        </View>
      ) : (
        <FlatList
          data={listParks}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: spacing, paddingTop: 130, gap: 12, paddingBottom: 100 }}
          refreshing={loading}
          onRefresh={load}
          ListEmptyComponent={
            <Empty text={coords ? 'No hay skateparks en este radio. Prueba uno más grande.' : 'Activa tu ubicación para ver la lista.'} />
          }
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
          {coords && view === 'list' && (
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
        {importing > 0 && <Text style={styles.importing}>Buscando skateparks en OpenStreetMap…</Text>}
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
