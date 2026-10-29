/**
 * Conversión de datos de OpenStreetMap a filas de la tabla skateparks.
 * Sin dependencias de React Native: la usan la app (lib/osm.ts) y el script de importación
 * masiva (scripts/import-osm-skateparks.ts).
 */
import { distanceKm, type LatLng } from './geo';

export type OsmElement = {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

export type SkateparkRow = {
  osm_id: string;
  name: string;
  description: string;
  address: string;
  lat: number;
  lng: number;
  created_by: string | null;
};

const DUPLICATE_METERS = 80; // dos parques más cerca que esto se consideran el mismo

/**
 * Consulta Overpass de skateparks dentro de `area`, p. ej. "(around:5000,19.4,-99.1)" o "(area.zona)".
 * `prelude` va antes de la consulta (p. ej. para definir el área de un estado).
 */
export function skateparkQuery(
  area: string,
  { timeout = 25, limit, prelude = '' }: { timeout?: number; limit?: number; prelude?: string } = {},
) {
  return `[out:json][timeout:${timeout}];${prelude}
(
  nwr["leisure"="pitch"]["sport"~"skateboard"]${area};
  nwr["leisure"="skatepark"]${area};
  nwr["sport"="skateboard"]["leisure"~"^(park|sports_centre|track|recreation_ground)$"]${area};
);
out center tags${limit ? ` ${limit}` : ''};`;
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
  return [street, tags['addr:suburb'] ?? tags['addr:city'], tags['addr:state']].filter(Boolean).join(', ');
}

/** Índice espacial simple (celdas de ~100 m) para detectar duplicados rápido aunque haya miles. */
class NearIndex {
  private cells = new Map<string, LatLng[]>();
  private static CELL = 0.001;
  private key(lat: number, lng: number) {
    return `${Math.floor(lat / NearIndex.CELL)},${Math.floor(lng / NearIndex.CELL)}`;
  }
  add(p: LatLng) {
    const k = this.key(p.lat, p.lng);
    this.cells.set(k, [...(this.cells.get(k) ?? []), p]);
  }
  hasNear(p: LatLng, meters: number) {
    const cy = Math.floor(p.lat / NearIndex.CELL);
    const cx = Math.floor(p.lng / NearIndex.CELL);
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++)
        for (const q of this.cells.get(`${cy + dy},${cx + dx}`) ?? []) if (distanceKm(p, q) * 1000 < meters) return true;
    return false;
  }
}

/**
 * Convierte elementos de OSM en filas, descartando tiendas y duplicados: un skatepark suele estar
 * dibujado varias veces (el parque y sus pistas) o ya existir en la base de datos (`existing`).
 */
export function toSkateparkRows(elements: OsmElement[], existing: LatLng[], createdBy: string | null): SkateparkRow[] {
  const index = new NearIndex();
  existing.forEach((p) => index.add(p));
  const rows: SkateparkRow[] = [];
  // Primero los que tienen nombre, para que sean ellos los que se conserven
  const sorted = [...elements].sort((a, b) => Number(!!b.tags?.name) - Number(!!a.tags?.name));
  for (const el of sorted) {
    const lat = el.lat ?? el.center?.lat;
    const lng = el.lon ?? el.center?.lon;
    const tags = el.tags ?? {};
    if (lat == null || lng == null || tags.shop) continue;
    if (index.hasNear({ lat, lng }, DUPLICATE_METERS)) continue;
    index.add({ lat, lng });
    rows.push({
      osm_id: `${el.type}/${el.id}`,
      name: tags.name ?? 'Skatepark',
      description: describe(tags),
      address: address(tags),
      lat,
      lng,
      created_by: createdBy,
    });
  }
  return rows;
}
