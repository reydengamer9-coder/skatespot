import { Link, router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Body, Button, Card, Empty, Icon, Screen, Title } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { formatDistance } from '@/lib/format';
import { useLocation } from '@/lib/location';
import { supabase } from '@/lib/supabase';
import type { Skatepark } from '@/lib/types';

const RADII = [5, 25, 100];

export default function ParksScreen() {
  const { coords, error, refresh } = useLocation();
  const [radius, setRadius] = useState(25);
  const [parks, setParks] = useState<Skatepark[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!coords) return;
    setLoading(true);
    const { data } = await supabase.rpc('nearby_skateparks', {
      user_lat: coords.lat,
      user_lng: coords.lng,
      radius_km: radius,
    });
    setParks((data as Skatepark[]) ?? []);
    setLoading(false);
  }, [coords, radius]);

  // Recarga al volver a la pestaña (p. ej. después de agregar un parque)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (error) {
    return (
      <Screen style={{ padding: spacing, justifyContent: 'center', gap: 12 }}>
        <Body>{error}</Body>
        <Button label="Reintentar" onPress={refresh} />
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.filters}>
        {RADII.map((r) => (
          <Pressable key={r} onPress={() => setRadius(r)} style={[styles.chip, radius === r && styles.chipActive]}>
            <Text style={[styles.chipText, radius === r && { color: colors.accentText }]}>{r} km</Text>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={parks}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: spacing, gap: 12, paddingBottom: 100 }}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={
          <Empty text={coords ? 'No hay skateparks registrados cerca. ¡Agrega el primero!' : 'Buscando tu ubicación…'} />
        }
        renderItem={({ item }) => (
          <Link href={{ pathname: '/park/[id]', params: { id: item.id } }} asChild>
            <Pressable>
              <Card>
                <View style={styles.row}>
                  <Title>{item.name}</Title>
                  <Text style={styles.distance}>{formatDistance(item.distance_km)}</Text>
                </View>
                {!!item.address && <Body muted>{item.address}</Body>}
              </Card>
            </Pressable>
          </Link>
        )}
      />

      <Pressable style={styles.fab} onPress={() => router.push('/park/new')}>
        <Icon ios="plus" material="add" color={colors.accentText} size={28} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing, paddingTop: spacing },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  chipText: { color: colors.text, fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  distance: { color: colors.accent, fontWeight: '700' },
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
