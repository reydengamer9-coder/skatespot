import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { StyleSheet } from 'react-native';

import type { MediaType } from '@/lib/types';

export function MediaView({ uri, type }: { uri: string; type: MediaType }) {
  if (type === 'video') return <Video uri={uri} />;
  return <Image source={{ uri }} style={styles.media} contentFit="cover" />;
}

function Video({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
  });
  return <VideoView player={player} style={styles.media} contentFit="cover" nativeControls />;
}

const styles = StyleSheet.create({
  media: { width: '100%', aspectRatio: 1, borderRadius: 12, backgroundColor: '#000' },
});
