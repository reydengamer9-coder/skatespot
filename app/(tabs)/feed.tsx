import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet } from 'react-native';

import { POST_SELECT, PostCard } from '@/components/PostCard';
import { Empty, Icon, Screen } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';
import type { Post } from '@/lib/types';

export default function FeedScreen() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('posts').select(POST_SELECT).order('created_at', { ascending: false }).limit(30);
    setPosts(data ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <Screen>
      <FlatList
        data={posts}
        keyExtractor={(p) => p.id}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={load}
        ListEmptyComponent={<Empty text="Aún no hay trucos. ¡Sube el primero!" />}
        renderItem={({ item }) => <PostCard post={item} />}
      />
      <Pressable style={styles.fab} onPress={() => router.push('/post/new')}>
        <Icon ios="video.badge.plus" material="add_a_photo" color={colors.accentText} size={26} />
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: spacing, gap: 16, paddingBottom: 100, maxWidth: 640, width: '100%', alignSelf: 'center' },
  fab: {
    position: 'absolute',
    right: spacing,
    bottom: spacing,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
