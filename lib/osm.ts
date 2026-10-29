import { distanceKm, type Bounds } from './geo';
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
const imported: Bounds[] = [];
const contains = (outer: Bounds, inner: Bounds) =>
  outer.south <= inner.south && outer.west <= inner.west && outer.north >= inner.north && outer.east >= inner.east;


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

/** Importa los skateparks en un radio alrededor del usuario. Devuelve cuántos se agregaron. */
export function importNearbySkateparks(coords: Coords, radiusKm: number, userId: string, existing: Skatepark[]) {
  const radius = Math.min(radiusKm, MAX_RADIUS_KM) * 1000;
  const box = (km: number) => {
    const dLat = km / 111;
    const dLng = km / (111 * Math.cos((coords.lat * Math.PI) / 180));
    return { south: coords.lat - dLat, north: coords.lat + dLat, west: coords.lng - dLng, east: coords.lng + dLng };
  };
  // Se salta si el círculo ya está cubierto; lo que queda cubierto es el cuadrado inscrito en él
  return importArea(
    `(around:${radius},${coords.lat},${coords.lng})`,
    box(radius / 1000),
    box(radius / 1000 / Math.SQRT2),
    userId,
    existing,
  );
}

const GRID = 0.25; // grados (~25 km): las zonas se redondean a esta cuadrícula
const MAX_BOUNDS_DEGREES = 3; // zonas más grandes (país entero) serían demasiado para Overpass

/** Importa los skateparks de la zona visible del mapa. Devuelve cuántos se agregaron. */
export function importSkateparksInBounds(b: Bounds, userId: string, existing: Skatepark[]) {
  const snap = (v: number, up: boolean) => (up ? Math.ceil(v / GRID) : Math.floor(v / GRID)) * GRID;
  const s = snap(b.south, false), w = snap(b.west, false), n = snap(b.north, true), e = snap(b.east, true);
  if (n - s > MAX_BOUNDS_DEGREES || e - w > MAX_BOUNDS_DEGREES) return Promise.resolve(0);
  const rect = { south: s, west: w, north: n, east: e };
  return importArea(`(${s},${w},${n},${e})`, rect, rect, userId, existing);
}

/** Devuelve cuántos parques nuevos se agregaron (0 si la zona ya estaba importada o falló la consulta). */
async function importArea(area: string, needed: Bounds, covers: Bounds, userId: string, existing: Skatepark[]) {
  if (imported.some((r) => contains(r, needed))) return 0;
  imported.push(covers);

  const query = `[out:json][timeout:25];
(
  nwr["leisure"="pitch"]["sport"~"skateboard"]${area};
  nwr["leisure"="skatepark"]${area};
  nwr["sport"="skateboard"]["leisure"~"^(park|sports_centre|track|recreation_ground)$"]${area};
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
      if (kept.some((k) => distanceKm(k, { lat, lng }) * 1000 < DUPLICATE_METERS)) continue;
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
    imported.splice(imported.indexOf(covers), 1); // reintentar la próxima vez
    console.warn('No se pudieron importar skateparks de OpenStreetMap', e);
    return 0;
  }
}
