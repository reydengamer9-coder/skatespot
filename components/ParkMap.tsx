import { useEffect, useRef, useState } from 'react';
import { WebView } from 'react-native-webview';

import { colors } from '@/constants/theme';
import { MAP_HTML, type MapData, type MapEvent } from '@/lib/mapHtml';

// Los tipos de react-native-webview usan `Props & undefined` por defecto, que TS 6 reduce a `never`.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
const MapWebView = WebView<{}>;

/** Mapa de skateparks (Android/iOS). La versión web está en ParkMap.web.tsx. */
export function ParkMap({ data, onSelect }: { data: MapData; onSelect: (id: string | null) => void }) {
  const ref = useRef<InstanceType<typeof MapWebView>>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) ref.current?.injectJavaScript(`window.setData(${JSON.stringify(data)}); true;`);
  }, [ready, data]);

  return (
    <MapWebView
      ref={ref}
      source={{ html: MAP_HTML }}
      originWhitelist={['*']}
      style={{ flex: 1, backgroundColor: colors.bg }}
      onMessage={(e) => {
        const msg = JSON.parse(e.nativeEvent.data) as MapEvent;
        if (msg.type === 'ready') setReady(true);
        else onSelect(msg.id);
      }}
    />
  );
}
