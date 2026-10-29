import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { MediaView } from '@/components/MediaView';
import { Body, Card, Icon } from '@/components/ui';
import { colors } from '@/constants/theme';
import { useUserId } from '@/lib/auth';
import { timeAgo } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Post } from '@/lib/types';

export const POST_SELECT = '*, profiles(username, avatar_url), skateparks(name), post_likes(user_id)';

export function PostCard({ post }: { post: Post }) {
  const userId = useUserId();
  const [likes, setLikes] = useState(post.post_likes?.map((l) => l.user_id) ?? []);
  const liked = likes.includes(userId);

  async function toggleLike() {
    // Actualización optimista
    setLikes(liked ? likes.filter((id) => id !== userId) : [...likes, userId]);
    if (liked) await supabase.from('post_likes').delete().match({ post_id: post.id, user_id: userId });
    else await supabase.from('post_likes').insert({ post_id: post.id, user_id: userId });
  }

  return (
    <Card style={{ gap: 10 }}>
      <View style={styles.header}>
        <Text style={styles.user}>@{post.profiles?.username ?? 'skater'}</Text>
        <Text style={styles.meta}>
          {post.skateparks?.name ? `${post.skateparks.name} · ` : ''}
          {timeAgo(post.created_at)}
        </Text>
      </View>
      <MediaView uri={post.media_url} type={post.media_type} />
      <Pressable onPress={toggleLike} style={styles.like}>
        <Icon
          ios={liked ? 'heart.fill' : 'heart'}
          material="favorite"
          color={liked ? colors.accent : colors.muted}
          size={22}
        />
        <Text style={{ color: colors.text, fontWeight: '600' }}>{likes.length}</Text>
      </Pressable>
      {!!post.caption && <Body>{post.caption}</Body>}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  user: { color: colors.text, fontWeight: '700' },
  meta: { color: colors.muted, fontSize: 13, flexShrink: 1, textAlign: 'right' },
  like: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});
