import { useEffect, useState } from 'react';
import { ScrollView } from 'react-native';

import { Body, Chip } from '@/components/ui';
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

