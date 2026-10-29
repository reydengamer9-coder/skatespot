import { useEffect, useRef, useState } from 'react';

import { MAP_HTML, type MapData, type MapEvent } from '@/lib/mapHtml';

/** Mapa de skateparks (web): el mismo HTML de Leaflet dentro de un iframe. */
export function ParkMap({ data, onEvent }: { data: MapData; onEvent: (e: MapEvent) => void }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const onEventRef = useRef(onEvent);
  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    function handle(e: MessageEvent) {
      if (e.source !== ref.current?.contentWindow || !e.data?.skatespot) return;
      const msg = JSON.parse(e.data.skatespot) as MapEvent;
      if (msg.type === 'ready') setReady(true);
      else onEventRef.current(msg);
    }
    window.addEventListener('message', handle);
    return () => window.removeEventListener('message', handle);
  }, []);

  useEffect(() => {
    if (ready) ref.current?.contentWindow?.postMessage({ skatespotData: data }, '*');
  }, [ready, data]);

  return (
    <iframe
      ref={ref}
      srcDoc={MAP_HTML}
      title="Mapa de skateparks"
      style={{ border: 0, width: '100%', height: '100%', flex: 1 }}
    />
  );
}
