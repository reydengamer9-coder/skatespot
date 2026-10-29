/**
 * Importación masiva de skateparks de Estados Unidos desde OpenStreetMap a Supabase.
 *
 * Se ejecuta con la GitHub Action "Importar skateparks" (.github/workflows/import-skateparks.yml)
 * o a mano:
 *
 *   SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/import-osm-skateparks.ts            # todos los estados
 *   SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/import-osm-skateparks.ts CA NY TX   # solo algunos
 *   npx tsx scripts/import-osm-skateparks.ts --dry-run CA                              # sin guardar
 *
 * Necesita la service_role key (o secret key) porque escribe saltándose RLS. Esa clave es
 * privada: guárdala solo como secreto de GitHub, nunca en el código.
 * Volver a ejecutarlo actualiza los parques existentes (por osm_id) y añade los nuevos.
 */
import { createClient } from '@supabase/supabase-js';

import { SUPABASE_URL } from '../lib/config';
import { skateparkQuery, toSkateparkRows, type OsmElement } from '../lib/osmParse';

const STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY',
  'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH',
  'OK', 'OR', 'PA', 'PR', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
];

const OVERPASS_URL = process.env.OVERPASS_URL ?? 'https://overpass-api.de/api/interpreter';
const PAUSE_MS = Number(process.env.PAUSE_MS ?? 2000); // respeta los límites del servidor público
const RETRY_MS = Number(process.env.RETRY_MS ?? 15000);
const CHUNK = 500;

const args: string[] = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const wanted = args.filter((a) => !a.startsWith('--')).map((a) => a.toUpperCase());
const states = wanted.length ? wanted : STATES;

const unknown = states.filter((s) => !STATES.includes(s));
if (unknown.length) throw new Error(`Estados desconocidos: ${unknown.join(', ')}`);

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!dryRun && !serviceKey) {
  throw new Error('Falta SUPABASE_SERVICE_ROLE_KEY (o usa --dry-run para probar sin guardar).');
}
const supabase = dryRun ? null : createClient(process.env.SUPABASE_URL ?? SUPABASE_URL, serviceKey!, { auth: { persistSession: false } });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function overpass(query: string): Promise<OsmElement[]> {
  for (let attempt = 1; ; attempt++) {
    let retryable = true;
    try {
      const res = await fetch(OVERPASS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'SkateSpot importer' },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (res.ok) return ((await res.json()) as { elements: OsmElement[] }).elements;
      // Solo se reintenta si el servidor está saturado; otros errores no se arreglan esperando
      retryable = [429, 502, 503, 504].includes(res.status);
      throw new Error(`Overpass respondió ${res.status}`);
    } catch (e) {
      if (!retryable || attempt >= 5) throw e;
    }
    const wait = RETRY_MS * attempt;
    console.log(`   servidor ocupado, reintento en ${wait / 1000} s…`);
    await sleep(wait);
  }
}

/** Todos los parques que ya hay en la base de datos (para no duplicar los que crearon usuarios). */
async function existingParks() {
  if (!supabase) return [];
  const all: { lat: number; lng: number; osm_id: string | null }[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from('skateparks').select('lat, lng, osm_id').order('id').range(from, from + 999);
    if (error) throw error;
    all.push(...data);
    if (data.length < 1000) return all;
  }
}

async function main() {
  console.log(`Importando skateparks de ${states.length} estados${dryRun ? ' (prueba, sin guardar)' : ''}…`);
  const existing = await existingParks();
  console.log(`Parques ya en la base de datos: ${existing.length}`);

  let total = 0;
  const failed: string[] = [];
  for (const state of states) {
    try {
      const elements = await overpass(
        skateparkQuery('(area.zona)', {
          timeout: 180,
          prelude: `\narea["ISO3166-2"="US-${state}"]->.zona;`,
        }),
      );
      // Al volver a importar, un parque de OSM se actualiza (mismo osm_id) en vez de descartarse por duplicado
      const ids = new Set(elements.map((e) => `${e.type}/${e.id}`));
      const others = existing.filter((p) => !p.osm_id || !ids.has(p.osm_id));
      const rows = toSkateparkRows(elements, others, null);

      if (supabase) {
        for (let i = 0; i < rows.length; i += CHUNK) {
          const { error } = await supabase.from('skateparks').upsert(rows.slice(i, i + CHUNK), { onConflict: 'osm_id' });
          if (error) throw error;
        }
      }
      total += rows.length;
      console.log(`✓ ${state}: ${rows.length} skateparks (${elements.length} elementos en OSM)`);
    } catch (e) {
      failed.push(state);
      console.error(`✗ ${state}: ${(e as Error).message}`);
    }
    await sleep(PAUSE_MS);
  }

  console.log(`\nTotal: ${total} skateparks${dryRun ? ' (no se guardó nada)' : ' guardados'}.`);
  if (failed.length) {
    console.error(`Fallaron: ${failed.join(' ')} — vuelve a ejecutar solo esos estados.`);
    process.exit(1);
  }
}

main();
