/**
 * Fotos de un skatepark buscadas en el momento en fuentes abiertas (sin key):
 *  1. Las vinculadas en su ficha de OpenStreetMap (etiquetas image, wikimedia_commons, wikidata).
 *  2. Fotos de Wikimedia Commons tomadas a pocos metros del parque.
 * No se guardan en la base de datos: solo se recuerdan en memoria mientras la app está abierta.
 */
import type { Skatepark } from './types';

export type ParkPhoto = {
  url: string; // miniatura (~800 px)
  credit: string; // autor y licencia, obligatorio en fotos libres
  sourceUrl: string; // página original de la foto
};

const COMMONS_API = 'https://commons.wikimedia.org/w/api.php';
const NEARBY_METERS = 150;
const MAX_PHOTOS = 12;

const cache = new Map<string, Promise<ParkPhoto[]>>();

type CommonsPage = {
  title: string;
  index?: number;
  imageinfo?: {
    thumburl?: string;
    url: string;
    descriptionurl: string;
    mime: string;
    extmetadata?: Record<string, { value: string } | undefined>;
  }[];
};

const stripHtml = (html = '') => html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

async function commons(params: Record<string, string>): Promise<CommonsPage[]> {
  const query = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*', // permite llamarla desde el navegador (CORS)
    prop: 'imageinfo',
    iiprop: 'url|mime|extmetadata',
    iiurlwidth: '800',
    iiextmetadatafilter: 'Artist|LicenseShortName|ImageDescription',
    ...params,
  });
  const res = await fetch(`${COMMONS_API}?${query}`);
  if (!res.ok) return [];
  const json = (await res.json()) as { query?: { pages?: Record<string, CommonsPage> } };
  return Object.values(json.query?.pages ?? {});
}

function toPhoto(page: CommonsPage): ParkPhoto | null {
  const info = page.imageinfo?.[0];
  if (!info || !/^image\/(jpeg|png|webp)$/.test(info.mime)) return null;
  const meta = info.extmetadata ?? {};
  const author = stripHtml(meta.Artist?.value) || 'Autor desconocido';
  const license = stripHtml(meta.LicenseShortName?.value);
  return {
    url: info.thumburl ?? info.url,
    credit: [author, license, 'Wikimedia Commons'].filter(Boolean).join(' · '),
    sourceUrl: info.descriptionurl,
  };
}

/** "File:Foo.jpg", "https://commons.wikimedia.org/wiki/File:Foo.jpg" → "File:Foo.jpg" */
function commonsFileTitle(value: string) {
  const m = decodeURIComponent(value).match(/(File:[^?#]+)$/);
  return m ? m[1].replace(/_/g, ' ') : null;
}

/** Fotos enlazadas desde la ficha del parque en OpenStreetMap. */
async function osmPhotos(osmId: string): Promise<ParkPhoto[]> {
  const res = await fetch(`https://api.openstreetmap.org/api/0.6/${osmId}.json`);
  if (!res.ok) return [];
  const tags: Record<string, string> = (await res.json()).elements?.[0]?.tags ?? {};

  const files = new Set<string>();
  const direct: ParkPhoto[] = [];
  for (const value of [tags.image, tags.wikimedia_commons].filter(Boolean) as string[]) {
    const title = commonsFileTitle(value);
    if (title) files.add(title);
    else if (value.startsWith('Category:')) {
      const pages = await commons({ generator: 'categorymembers', gcmtitle: value, gcmtype: 'file', gcmlimit: '10' });
      pages.forEach((p) => files.add(p.title));
    } else if (/^https?:\/\/.+\.(jpe?g|png|webp)$/i.test(value)) {
      direct.push({ url: value, credit: 'Imagen enlazada en OpenStreetMap', sourceUrl: `https://www.openstreetmap.org/${osmId}` });
    }
  }

  // Imagen principal (P18) de Wikidata
  if (tags.wikidata) {
    const wd = await fetch(`https://www.wikidata.org/wiki/Special:EntityData/${tags.wikidata}.json`);
    if (wd.ok) {
      const file = (await wd.json()).entities?.[tags.wikidata]?.claims?.P18?.[0]?.mainsnak?.datavalue?.value;
      if (file) files.add(`File:${file}`);
    }
  }

  if (!files.size) return direct;
  const pages = await commons({ titles: [...files].slice(0, 20).join('|') });
  return [...direct, ...(pages.map(toPhoto).filter(Boolean) as ParkPhoto[])];
}

/** Fotos de Commons tomadas cerca del parque; primero las que mencionan skate. */
async function nearbyPhotos(lat: number, lng: number): Promise<ParkPhoto[]> {
  const pages = await commons({
    generator: 'geosearch',
    ggscoord: `${lat}|${lng}`,
    ggsradius: String(NEARBY_METERS),
    ggsnamespace: '6', // solo archivos
    ggslimit: '30',
  });
  const isSkate = (p: CommonsPage) =>
    /skate|bowl|halfpipe|half-pipe|patin/i.test(p.title + stripHtml(p.imageinfo?.[0]?.extmetadata?.ImageDescription?.value));
  return pages
    .sort((a, b) => Number(isSkate(b)) - Number(isSkate(a)) || (a.index ?? 0) - (b.index ?? 0))
    .map(toPhoto)
    .filter(Boolean) as ParkPhoto[];
}

export function getParkPhotos(park: Pick<Skatepark, 'id' | 'lat' | 'lng' | 'osm_id'>): Promise<ParkPhoto[]> {
  if (!cache.has(park.id)) {
    const job = Promise.all([
      park.osm_id ? osmPhotos(park.osm_id).catch(() => []) : [],
      nearbyPhotos(park.lat, park.lng).catch(() => []),
    ]).then(([own, near]) => {
      const seen = new Set<string>();
      return [...own, ...near].filter((p) => !seen.has(p.sourceUrl) && seen.add(p.sourceUrl)).slice(0, MAX_PHOTOS);
    });
    // Si falla todo, se vuelve a intentar la próxima vez
    job.then((photos) => !photos.length && cache.delete(park.id));
    cache.set(park.id, job);
  }
  return cache.get(park.id)!;
}
