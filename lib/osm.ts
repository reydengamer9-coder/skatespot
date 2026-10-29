import type { Coords } from './location';
import { supabase } from './supabase';
import type { Skatepark } from './types';

/**
 * Importa skateparks de OpenStreetMap (datos abiertos, licencia ODbL) a nuestra base de datos.
 * Se consultan con la Overpass API, gratis y sin key. Cada parque se guarda una sola vez
 * gracias a la columna única skateparks.osm_id.
 */

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const MAX_RADIUS_KM = 50; // radios mayores hacen la consulta lenta para Overpass
const DUPLICATE_METERS = 80; // dos parques más cerca que esto se consideran el mismo

type OsmElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

// Zonas ya importadas en esta sesión, para no repetir la consulta
const imported = new Set<string>();

function distanceMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = Math.PI / 180;
  const x = (b.lng - a.lng) * rad * Math.cos(((a.lat + b.lat) / 2) * rad);
  const y = (b.lat - a.lat) * rad;
  return Math.sqrt(x * x + y * y) * 6371000;
}

function describe(tags: Record<string, string>) {
  const surface: Record<string, string> = { concrete: 'concreto', asphalt: 'asfalto', wood: 'madera', metal: 'metal' };
  const parts = [
    tags.surface && `Superficie: ${surface[tags.surface] ?? tags.surface}`,
    tags.lit === 'yes' && 'Iluminado',
    tags.covered === 'yes' && 'Techado',
    tags.fee === 'no' && 'Gratis',
    tags.opening_hours && `Horario: ${tags.opening_hours}`,
  ].filter(Boolean);
  return [tags.description, parts.join(' · ')].filter(Boolean).join('\n');
}

function address(tags: Record<string, string>) {
  const street = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
  return [street, tags['addr:suburb'] ?? tags['addr:city']].filter(Boolean).join(', ');
}

/** Devuelve cuántos parques nuevos se agregaron (0 si la zona ya estaba importada o falló la consulta). */
export async function importNearbySkateparks(coords: Coords, radiusKm: number, userId: string, existing: Skatepark[]) {
  const radius = Math.min(radiusKm, MAX_RADIUS_KM) * 1000;
  // ~1 km de precisión: moverse un poco no repite la consulta
  const key = `${coords.lat.toFixed(2)},${coords.lng.toFixed(2)},${radius}`;
  if (imported.has(key)) return 0;
  imported.add(key);

  const around = `(around:${radius},${coords.lat},${coords.lng})`;
  const query = `[out:json][timeout:25];
(
  nwr["leisure"="pitch"]["sport"~"skateboard"]${around};
  nwr["leisure"="skatepark"]${around};
  nwr["sport"="skateboard"]["leisure"~"^(park|sports_centre|track|recreation_ground)$"]${around};
);
out center tags 300;`;

  try {
    const res = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });
    if (!res.ok) throw new Error(`Overpass ${res.status}`);
    const { elements } = (await res.json()) as { elements: OsmElement[] };

    // Un skatepark suele estar dibujado varias veces (el parque y sus pistas): nos quedamos con uno
    const kept: { lat: number; lng: number }[] = existing.map((p) => ({ lat: p.lat, lng: p.lng }));
    const rows = [];
    // Primero los que tienen nombre, para que sean ellos los que se conserven
    const sorted = [...elements].sort((a, b) => Number(!!b.tags?.name) - Number(!!a.tags?.name));
    for (const el of sorted) {
      const lat = el.lat ?? el.center?.lat;
      const lng = el.lon ?? el.center?.lon;
      const tags = el.tags ?? {};
      if (lat == null || lng == null || tags.shop) continue;
      if (kept.some((k) => distanceMeters(k, { lat, lng }) < DUPLICATE_METERS)) continue;
      kept.push({ lat, lng });
      rows.push({
        osm_id: `${el.type}/${el.id}`,
        name: tags.name ?? 'Skatepark',
        description: describe(tags),
        address: address(tags),
        lat,
        lng,
        created_by: userId,
      });
    }
    if (!rows.length) return 0;

    const { data, error } = await supabase
      .from('skateparks')
      .upsert(rows, { onConflict: 'osm_id', ignoreDuplicates: true })
      .select('id');
    if (error) throw error;
    return data?.length ?? 0;
  } catch (e) {
    imported.delete(key); // reintentar la próxima vez
    console.warn('No se pudieron importar skateparks de OpenStreetMap', e);
    return 0;
  }
}
