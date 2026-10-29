import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { POST_SELECT, PostCard } from '@/components/PostCard';
import { Body, Button, Empty, Input, Screen, Title } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { useUserId } from '@/lib/auth';
import { pickMedia, uploadMedia } from '@/lib/media';
import { supabase } from '@/lib/supabase';
import type { Post, Profile } from '@/lib/types';
import { showAlert } from '@/lib/alert';

export default function ProfileScreen() {
  const userId = useUserId();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [posts, setPosts] = useState<Post[]>([]);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [{ data: p }, { data: po }] = await Promise.all([
          supabase.from('profiles').select('*').eq('id', userId).single(),
          supabase.from('posts').select(POST_SELECT).eq('user_id', userId).order('created_at', { ascending: false }),
        ]);
        if (p) {
          setProfile(p);
          setUsername(p.username);
          setBio(p.bio ?? '');
        }
        setPosts(po ?? []);
      })();
    }, [userId]),
  );

  async function save(changes: Partial<Profile>) {
    setSaving(true);
    const { error } = await supabase.from('profiles').update(changes).eq('id', userId);
    setSaving(false);
    if (error) return showAlert('Error', error.message);
    setProfile((prev) => (prev ? { ...prev, ...changes } : prev));
  }

  async function changeAvatar() {
    const picked = await pickMedia(['images']);
    if (!picked) return;
    try {
      await save({ avatar_url: await uploadMedia(userId, picked) });
    } catch (e) {
      showAlert('Error', (e as Error).message);
    }
  }

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Pressable onPress={changeAvatar}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarEmpty]}>
                <Text style={{ color: colors.accent, fontSize: 36, fontWeight: '900' }}>
                  {profile?.username?.[0]?.toUpperCase() ?? '?'}
                </Text>
              </View>
            )}
          </Pressable>
          <Body muted>Toca la foto para cambiarla</Body>
        </View>

        <Input placeholder="Nombre de usuario" autoCapitalize="none" value={username} onChangeText={setUsername} />
        <Input placeholder="Bio: stance, tabla, trucos favoritos…" value={bio} onChangeText={setBio} multiline />
        <Button label="Guardar perfil" onPress={() => save({ username: username.trim(), bio })} loading={saving} />

        <View style={{ marginTop: spacing }}>
          <Title>Mis trucos ({posts.length})</Title>
        </View>
        {posts.length ? posts.map((p) => <PostCard key={p.id} post={p} />) : <Empty text="Todavía no has subido trucos." />}

        <Button label="Cerrar sesión" variant="secondary" onPress={() => supabase.auth.signOut()} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing, gap: 12, maxWidth: 640, width: '100%', alignSelf: 'center' },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarEmpty: { backgroundColor: colors.card, borderWidth: 2, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' },
});
