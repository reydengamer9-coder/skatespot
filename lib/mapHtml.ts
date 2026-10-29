import { colors } from '@/constants/theme';

import { MAP_STYLE_URL } from './config';

export type MapPark = { id: string; name: string; lat: number; lng: number; live: number };
export type MapData = { parks: MapPark[]; user: { lat: number; lng: number } | null; selectedId: string | null };
export type MapEvent = { type: 'ready' } | { type: 'select'; id: string | null };

const MAPLIBRE = 'https://unpkg.com/maplibre-gl@5.24.0/dist';

/**
 * Página HTML con un mapa vectorial MapLibre GL (código abierto) + teselas de OpenFreeMap
 * (gratis, sin key). La app le manda datos con window.setData(...) (móvil) o postMessage (web),
 * y el mapa avisa cuando se toca un parque.
 */
export const MAP_HTML = `<!doctype html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="${MAPLIBRE}/maplibre-gl.css">
<script src="${MAPLIBRE}/maplibre-gl.js"></script>
<style>
  html, body, #map { margin: 0; height: 100%; background: #e8e4dc; }
  .pin { width: 36px; height: 36px; border-radius: 50%; background: #fff; border: 3px solid ${colors.accent};
         display: flex; align-items: center; justify-content: center; font-size: 18px; position: relative;
         box-shadow: 0 2px 8px rgba(0,0,0,.35); cursor: pointer; transition: transform .15s; }
  .pin.selected { transform: scale(1.3); background: ${colors.accent}; }
  .pin.live { border-color: ${colors.live}; }
  .pin.live::after { content: ''; position: absolute; inset: -9px; border-radius: 50%;
         border: 3px solid ${colors.live}; animation: pulse 1.6s ease-out infinite; pointer-events: none; }
  .pin b { position: absolute; top: -8px; right: -8px; background: ${colors.live}; color: #fff; font: 700 11px sans-serif;
         min-width: 18px; height: 18px; border-radius: 9px; display: flex; align-items: center; justify-content: center; }
  .me { width: 16px; height: 16px; border-radius: 50%; background: ${colors.user}; border: 3px solid #fff;
        box-shadow: 0 0 0 7px rgba(59,130,246,.25); }
  @keyframes pulse { from { transform: scale(.8); opacity: 1 } to { transform: scale(1.6); opacity: 0 } }
</style>
</head><body><div id="map"></div>
<script>
  var map = new maplibregl.Map({
    container: 'map',
    style: '${MAP_STYLE_URL}',
    center: [-40, 20],
    zoom: 1.5,
    attributionControl: { compact: true }
  });
  var markers = [], meMarker = null, centered = false;

  function send(msg) {
    var s = JSON.stringify(msg);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s);
    else window.parent.postMessage({ skatespot: s }, '*');
  }

  window.setData = function (d) {
    markers.forEach(function (m) { m.remove(); });
    markers = d.parks.map(function (p) {
      var el = document.createElement('div');
      el.className = 'pin' + (p.live ? ' live' : '') + (p.id === d.selectedId ? ' selected' : '');
      el.innerHTML = '🛹' + (p.live ? '<b>' + p.live + '</b>' : '');
      el.addEventListener('click', function (e) { e.stopPropagation(); send({ type: 'select', id: p.id }); });
      if (p.live) el.style.zIndex = 2;
      return new maplibregl.Marker({ element: el }).setLngLat([p.lng, p.lat]).addTo(map);
    });

    if (d.user) {
      if (!meMarker) {
        var me = document.createElement('div');
        me.className = 'me';
        meMarker = new maplibregl.Marker({ element: me }).setLngLat([d.user.lng, d.user.lat]).addTo(map);
      } else meMarker.setLngLat([d.user.lng, d.user.lat]);
    }

    // Centrar solo la primera vez para no mover el mapa mientras el usuario lo explora
    if (!centered && (d.user || d.parks.length)) {
      centered = true;
      if (d.user) map.jumpTo({ center: [d.user.lng, d.user.lat], zoom: 11 });
      else {
        var b = new maplibregl.LngLatBounds();
        d.parks.forEach(function (p) { b.extend([p.lng, p.lat]); });
        map.fitBounds(b, { padding: 60, maxZoom: 13, duration: 0 });
      }
    }
    if (d.selectedId) {
      var sel = d.parks.find(function (p) { return p.id === d.selectedId; });
      // Desplazado hacia arriba para que la tarjeta del parque no tape el pin
      if (sel) map.easeTo({ center: [sel.lng, sel.lat], offset: [0, -140] });
    }
  };

  window.addEventListener('message', function (e) {
    if (e.data && e.data.skatespotData) window.setData(e.data.skatespotData);
  });
  // Un toque en el mapa (no en un pin) cierra la tarjeta del parque
  map.on('click', function (e) {
    if (!e.originalEvent.target.closest('.pin')) send({ type: 'select', id: null });
  });
  send({ type: 'ready' });
</script></body></html>`;
