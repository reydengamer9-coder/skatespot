import { colors } from '@/constants/theme';

import { MAP_STYLE_URL } from './config';
import type { Bounds } from './geo';

export type MapPark = { id: string; lat: number; lng: number; live: number };
export type MapData = { parks: MapPark[]; user: { lat: number; lng: number } | null; selectedId: string | null };
export type MapEvent =
  | { type: 'ready' }
  | { type: 'select'; id: string | null }
  | { type: 'bounds'; bounds: Bounds; zoom: number };

const MAPLIBRE = 'https://unpkg.com/maplibre-gl@5.24.0/dist';

/** Tabla de skate vista desde arriba, en diagonal: tabla de color con borde blanco y 4 ruedas. */
function boardSvg(color: string) {
  const wheel = (x: number, y: number) =>
    `<rect x="${x}" y="${y}" width="7" height="10" rx="2.5" fill="#1b1b1f" stroke="#fff" stroke-width="2"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
  <g transform="rotate(-35 32 32)">
    ${wheel(15, 12)}${wheel(42, 12)}${wheel(15, 42)}${wheel(42, 42)}
    <rect x="21" y="5" width="22" height="54" rx="11" fill="${color}" stroke="#fff" stroke-width="3"/>
    <line x1="25" y1="17" x2="39" y2="17" stroke="rgba(0,0,0,.35)" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="25" y1="47" x2="39" y2="47" stroke="rgba(0,0,0,.35)" stroke-width="2.5" stroke-linecap="round"/>
  </g>
</svg>`;
}

const ICONS = { board: boardSvg(colors.accent), 'board-live': boardSvg(colors.live) };

/**
 * Página HTML con un mapa vectorial MapLibre GL (código abierto) + teselas de OpenFreeMap
 * (gratis, sin key). Los parques se dibujan como capa GeoJSON agrupada (clusters), así el
 * mapa aguanta miles de parques. La app le manda datos con window.setData(...) (móvil) o
 * postMessage (web); el mapa avisa cuando se toca un parque o cambia la zona visible.
 */
export const MAP_HTML = `<!doctype html>
<html><head>
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
<link rel="stylesheet" href="${MAPLIBRE}/maplibre-gl.css">
<script src="${MAPLIBRE}/maplibre-gl.js"></script>
<style>
  html, body, #map { margin: 0; height: 100%; background: ${colors.bg}; }
  .me { width: 16px; height: 16px; border-radius: 50%; background: ${colors.user}; border: 3px solid #fff;
        box-shadow: 0 0 0 7px rgba(59,130,246,.25); }
</style>
</head><body><div id="map"></div>
<script>
  var CLUSTER_MAX_ZOOM = 11;
  var map = new maplibregl.Map({
    container: 'map',
    style: '${MAP_STYLE_URL}',
    center: [-40, 20],
    zoom: 1.5,
    attributionControl: { compact: true }
  });
  var loaded = false, pending = null, meMarker = null, centered = false;

  function send(msg) {
    var s = JSON.stringify(msg);
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(s);
    else window.parent.postMessage({ skatespot: s }, '*');
  }

  function toGeoJSON(d) {
    return {
      type: 'FeatureCollection',
      features: d.parks.map(function (p) {
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
          properties: { id: p.id, live: p.live, selected: p.id === d.selectedId }
        };
      })
    };
  }

  function apply(d) {
    map.getSource('parks').setData(toGeoJSON(d));

    if (d.user) {
      if (!meMarker) {
        var me = document.createElement('div');
        me.className = 'me';
        meMarker = new maplibregl.Marker({ element: me }).setLngLat([d.user.lng, d.user.lat]).addTo(map);
      } else meMarker.setLngLat([d.user.lng, d.user.lat]);
    }

    // Centrar en el usuario solo la primera vez para no mover el mapa mientras lo explora
    if (!centered && d.user) {
      centered = true;
      map.jumpTo({ center: [d.user.lng, d.user.lat], zoom: 10 });
    }
    if (d.selectedId) {
      var sel = d.parks.find(function (p) { return p.id === d.selectedId; });
      // Desplazado hacia arriba para que la tarjeta del parque no tape el punto
      if (sel) map.easeTo({ center: [sel.lng, sel.lat], zoom: Math.max(map.getZoom(), CLUSTER_MAX_ZOOM + 1), offset: [0, -140] });
    }
  }

  window.setData = function (d) {
    if (loaded) apply(d);
    else pending = d;
  };

  // Carga los iconos SVG de tabla como imágenes del mapa (a 2x para que se vean nítidos)
  function addIcon(name, svg) {
    return new Promise(function (resolve) {
      var img = new Image(64, 64);
      img.onload = function () { map.addImage(name, img, { pixelRatio: 2 }); resolve(); };
      img.onerror = resolve;
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
    });
  }
  var ICONS = ${JSON.stringify(ICONS)};

  map.on('load', function () {
    Promise.all(Object.keys(ICONS).map(function (k) { return addIcon(k, ICONS[k]); })).then(setup);
  });

  function setup() {
    map.addSource('parks', {
      type: 'geojson',
      data: { type: 'FeatureCollection', features: [] },
      cluster: true,
      clusterMaxZoom: CLUSTER_MAX_ZOOM,
      clusterRadius: 45,
      clusterProperties: { live: ['+', ['case', ['>', ['get', 'live'], 0], 1, 0]] }
    });
    map.addLayer({
      id: 'clusters', type: 'circle', source: 'parks', filter: ['has', 'point_count'],
      paint: {
        'circle-color': ['case', ['>', ['get', 'live'], 0], '${colors.live}', '${colors.accent}'],
        'circle-radius': ['step', ['get', 'point_count'], 15, 10, 19, 50, 24, 200, 30],
        'circle-stroke-width': 4,
        'circle-stroke-color': 'rgba(255,255,255,0.25)'
      }
    });
    map.addLayer({
      id: 'cluster-count', type: 'symbol', source: 'parks', filter: ['has', 'point_count'],
      layout: { 'text-field': ['get', 'point_count_abbreviated'], 'text-font': ['Noto Sans Bold'], 'text-size': 13 },
      paint: { 'text-color': '${colors.accentText}' }
    });
    // Halo animado bajo los parques con sesión en vivo
    map.addLayer({
      id: 'live-halo', type: 'circle', source: 'parks',
      filter: ['all', ['!', ['has', 'point_count']], ['>', ['get', 'live'], 0]],
      paint: { 'circle-color': '${colors.live}', 'circle-radius': 10, 'circle-opacity': 0.5 }
    });
    (function animate(t) {
      var k = (t % 1600) / 1600;
      map.setPaintProperty('live-halo', 'circle-radius', 10 + k * 18);
      map.setPaintProperty('live-halo', 'circle-opacity', 0.6 * (1 - k));
      requestAnimationFrame(animate);
    })(0);
    map.addLayer({
      id: 'park', type: 'symbol', source: 'parks', filter: ['!', ['has', 'point_count']],
      layout: {
        'icon-image': ['case', ['>', ['get', 'live'], 0], 'board-live', 'board'],
        'icon-size': ['case', ['get', 'selected'], 1.9, 1.3],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true
      }
    });

    map.on('click', 'park', function (e) { send({ type: 'select', id: e.features[0].properties.id }); });
    map.on('click', 'clusters', function (e) {
      var f = e.features[0];
      map.getSource('parks').getClusterExpansionZoom(f.properties.cluster_id).then(function (z) {
        map.easeTo({ center: f.geometry.coordinates, zoom: z });
      });
    });
    map.on('click', function (e) {
      if (!map.queryRenderedFeatures(e.point, { layers: ['park', 'clusters'] }).length) send({ type: 'select', id: null });
    });
    ['park', 'clusters'].forEach(function (l) {
      map.on('mouseenter', l, function () { map.getCanvas().style.cursor = 'pointer'; });
      map.on('mouseleave', l, function () { map.getCanvas().style.cursor = ''; });
    });

    loaded = true;
    if (pending) apply(pending);
    sendBounds();
  }

  // Avisa a la app de la zona visible para cargar (e importar) los parques de ahí
  var boundsTimer = null;
  function sendBounds() {
    var b = map.getBounds();
    send({ type: 'bounds', zoom: map.getZoom(),
      bounds: { south: b.getSouth(), west: b.getWest(), north: b.getNorth(), east: b.getEast() } });
  }
  map.on('moveend', function () { clearTimeout(boundsTimer); boundsTimer = setTimeout(sendBounds, 400); });

  window.addEventListener('message', function (e) {
    if (e.data && e.data.skatespotData) window.setData(e.data.skatespotData);
  });
  send({ type: 'ready' });
</script></body></html>`;
