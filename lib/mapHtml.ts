import { colors } from '@/constants/theme';

import { CARTO_BASEMAPS_KEY } from './config';

export type MapPark = { id: string; name: string; lat: number; lng: number; live: number };
export type MapData = { parks: MapPark[]; user: { lat: number; lng: number } | null; selectedId: string | null };
export type MapEvent = { type: 'ready' } | { type: 'select'; id: string | null };

/**
 * Página HTML con un mapa Leaflet + teselas de CARTO/OpenStreetMap (key gratuita en lib/config.ts).
 * La app le manda datos con window.setData(...) (móvil) o postMessage (web),
 * y el mapa avisa cuando se toca un parque.
 */
export const MAP_HTML = `<!doctype html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  html, body, #map { margin: 0; height: 100%; background: ${colors.bg}; }
  .pin { width: 34px; height: 34px; border-radius: 50%; background: ${colors.card}; border: 2px solid ${colors.accent};
         display: flex; align-items: center; justify-content: center; font-size: 17px; position: relative;
         box-shadow: 0 2px 8px rgba(0,0,0,.5); transition: transform .15s; }
  .pin.selected { transform: scale(1.3); background: ${colors.accent}; }
  .pin.live { border-color: ${colors.live}; }
  .pin.live::after { content: ''; position: absolute; inset: -8px; border-radius: 50%;
         border: 3px solid ${colors.live}; animation: pulse 1.6s ease-out infinite; }
  .pin b { position: absolute; top: -8px; right: -8px; background: ${colors.live}; color: #fff; font: 700 11px sans-serif;
         min-width: 18px; height: 18px; border-radius: 9px; display: flex; align-items: center; justify-content: center; }
  .me { width: 16px; height: 16px; border-radius: 50%; background: ${colors.user}; border: 3px solid #fff;
        box-shadow: 0 0 0 6px rgba(59,130,246,.3); }
  @keyframes pulse { from { transform: scale(.8); opacity: 1 } to { transform: scale(1.6); opacity: 0 } }
  .leaflet-control-attribution { font-size: 9px; }
</style>
</head><body><div id="map"></div>
<script>
  var map = L.map('map', { zoomControl: false }).setView([20, -40], 2);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${CARTO_BASEMAPS_KEY}', {
    maxZoom: 19, subdomains: 'abcd',
    attribution: '&copy; OpenStreetMap &copy; CARTO'
  }).addTo(map);

  var layer = L.layerGroup().addTo(map);
  var meMarker = null, centered = false;

  function send(msg) {
    var s = JSON.stringify(msg);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s);
    else window.parent.postMessage({ skatespot: s }, '*');
  }

  window.setData = function (d) {
    layer.clearLayers();
    d.parks.forEach(function (p) {
      var cls = 'pin' + (p.live ? ' live' : '') + (p.id === d.selectedId ? ' selected' : '');
      var html = '<div class="' + cls + '">🛹' + (p.live ? '<b>' + p.live + '</b>' : '') + '</div>';
      L.marker([p.lat, p.lng], {
        icon: L.divIcon({ html: html, className: '', iconSize: [34, 34], iconAnchor: [17, 17] }),
        zIndexOffset: p.live ? 1000 : 0
      }).on('click', function (e) { L.DomEvent.stopPropagation(e); send({ type: 'select', id: p.id }); })
        .addTo(layer);
    });

    if (d.user) {
      if (!meMarker) meMarker = L.marker([d.user.lat, d.user.lng], {
        icon: L.divIcon({ html: '<div class="me"></div>', className: '', iconSize: [16, 16] }), interactive: false
      }).addTo(map);
      else meMarker.setLatLng([d.user.lat, d.user.lng]);
    }

    // Centrar solo la primera vez para no mover el mapa mientras el usuario lo explora
    if (!centered && (d.user || d.parks.length)) {
      centered = true;
      if (d.user) map.setView([d.user.lat, d.user.lng], 12);
      else map.fitBounds(d.parks.map(function (p) { return [p.lat, p.lng]; }), { padding: [40, 40], maxZoom: 13 });
    }
    if (d.selectedId) {
      var sel = d.parks.find(function (p) { return p.id === d.selectedId; });
      if (sel) map.panTo([sel.lat, sel.lng]);
    }
  };

  window.addEventListener('message', function (e) {
    if (e.data && e.data.skatespotData) window.setData(e.data.skatespotData);
  });
  map.on('click', function () { send({ type: 'select', id: null }); });
  send({ type: 'ready' });
</script></body></html>`;
