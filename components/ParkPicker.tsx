import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { Body } from '@/components/ui';
import { colors } from '@/constants/theme';
import { formatDistance } from '@/lib/format';
import { useLocation } from '@/lib/location';
import { supabase } from '@/lib/supabase';
import type { Skatepark } from '@/lib/types';

/** Selector horizontal de skateparks cercanos (100 km). */
export function ParkPicker({
  value,
  onChange,
  optional,
}: {
  value: string | null;
  onChange: (id: string | null) => void;
  optional?: boolean;
}) {
  const { coords } = useLocation();
  const [parks, setParks] = useState<Skatepark[]>([]);

  useEffect(() => {
    if (!coords) return;
    supabase
      .rpc('nearby_skateparks', { user_lat: coords.lat, user_lng: coords.lng, radius_km: 100 })
      .then(({ data }) => setParks((data as Skatepark[]) ?? []));
  }, [coords]);

  if (!parks.length) return <Body muted>{coords ? 'No hay skateparks cercanos.' : 'Buscando skateparks cercanos…'}</Body>;

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {optional && <Chip label="Ninguno" active={value === null} onPress={() => onChange(null)} />}
      {parks.map((p) => (
        <Chip
          key={p.id}
          label={`${p.name} · ${formatDistance(p.distance_km)}`}
          active={value === p.id}
          onPress={() => onChange(p.id)}
        />
      ))}
    </ScrollView>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.active]}>
      <Text style={{ color: active ? colors.accentText : colors.text, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 99, borderWidth: 1, borderColor: colors.border },
  active: { backgroundColor: colors.accent, borderColor: colors.accent },
});
