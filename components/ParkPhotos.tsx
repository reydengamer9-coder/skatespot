import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { getParkPhotos, type ParkPhoto } from '@/lib/parkPhotos';
import type { Skatepark } from '@/lib/types';

/** Galería horizontal: foto subida al registrar el parque + fotos libres buscadas en el momento. */
export function ParkPhotos({ park }: { park: Skatepark }) {
  const [photos, setPhotos] = useState<ParkPhoto[] | null>(null);

  useEffect(() => {
    let active = true;
    getParkPhotos(park).then((p) => active && setPhotos(p));
    return () => {
      active = false;
    };
  }, [park]);

  const own: ParkPhoto[] = park.photo_url ? [{ url: park.photo_url, credit: 'Foto de la comunidad', sourceUrl: '' }] : [];
  const all = [...own, ...(photos ?? [])];

  if (photos === null && !all.length) {
    return (
      <View style={styles.placeholder}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.muted}>Buscando fotos…</Text>
      </View>
    );
  }
  if (!all.length) {
    return (
      <View style={styles.placeholder}>
        <Text style={{ fontSize: 32 }}>🛹</Text>
        <Text style={styles.muted}>Aún no hay fotos de este parque</Text>
      </View>
    );
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
      {all.map((p) => (
        <Pressable key={p.url} onPress={() => p.sourceUrl && Linking.openURL(p.sourceUrl)} style={styles.item}>
          {/* cachePolicy "memory": no se acumulan en el disco del teléfono */}
          <Image source={{ uri: p.url }} style={styles.photo} contentFit="cover" cachePolicy="memory" transition={200} />
          <Text style={styles.credit} numberOfLines={1}>
            {p.credit}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  item: { width: 300, gap: 4 },
  photo: { width: 300, aspectRatio: 4 / 3, borderRadius: 14, backgroundColor: colors.card },
  placeholder: {
    height: 160,
    borderRadius: 14,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  muted: { color: colors.muted },
  credit: { color: colors.muted, fontSize: 11 },
});
