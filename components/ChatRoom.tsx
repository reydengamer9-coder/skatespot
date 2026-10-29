import { useEffect, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Icon, Input } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { useUserId } from '@/lib/auth';
import { timeAgo } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { Message } from '@/lib/types';

/** Chat en tiempo real. parkId = null es el canal general. */
export function ChatRoom({ parkId }: { parkId: string | null }) {
  const userId = useUserId();
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const usernames = useRef(new Map<string, string>());

  useEffect(() => {
    let active = true;

    async function withUsername(msg: Message): Promise<Message> {
      let username = usernames.current.get(msg.user_id);
      if (!username) {
        const { data } = await supabase.from('profiles').select('username').eq('id', msg.user_id).single();
        username = data?.username ?? 'skater';
        usernames.current.set(msg.user_id, username!);
      }
      return { ...msg, profiles: { username: username!, avatar_url: null } };
    }

    let query = supabase
      .from('messages')
      .select('*, profiles(username, avatar_url)')
      .order('created_at', { ascending: false })
      .limit(50);
    query = parkId ? query.eq('park_id', parkId) : query.is('park_id', null);
    query.then(({ data }) => {
      if (!active) return;
      data?.forEach((m) => m.profiles && usernames.current.set(m.user_id, m.profiles.username));
      setMessages(data ?? []);
    });

    const channel = supabase
      .channel(`chat:${parkId ?? 'general'}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          ...(parkId ? { filter: `park_id=eq.${parkId}` } : {}),
        },
        async (payload) => {
          const msg = payload.new as Message;
          if ((msg.park_id ?? null) !== parkId) return;
          const full = await withUsername(msg);
          if (active) setMessages((prev) => (prev.some((m) => m.id === full.id) ? prev : [full, ...prev]));
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [parkId]);

  async function send() {
    const content = text.trim();
    if (!content) return;
    setText('');
    await supabase.from('messages').insert({ content, park_id: parkId, user_id: userId });
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}>
      <FlatList
        inverted
        data={messages}
        keyExtractor={(m) => String(m.id)}
        contentContainerStyle={{ padding: spacing, gap: 8 }}
        renderItem={({ item }) => {
          const mine = item.user_id === userId;
          return (
            <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
              {!mine && <Text style={styles.author}>@{item.profiles?.username ?? 'skater'}</Text>}
              <Text style={{ color: mine ? colors.accentText : colors.text, fontSize: 15 }}>{item.content}</Text>
              <Text style={[styles.time, mine && { color: colors.accentText }]}>{timeAgo(item.created_at)}</Text>
            </View>
          );
        }}
      />
      <View style={styles.composer}>
        <Input
          style={{ flex: 1 }}
          placeholder="Escribe un mensaje…"
          value={text}
          onChangeText={setText}
          onSubmitEditing={send}
          returnKeyType="send"
        />
        <Pressable onPress={send} style={styles.send}>
          <Icon ios="paperplane.fill" material="send" color={colors.accentText} size={22} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bubble: { maxWidth: '80%', padding: 10, borderRadius: 16, gap: 2 },
  mine: { alignSelf: 'flex-end', backgroundColor: colors.accent, borderBottomRightRadius: 4 },
  theirs: { alignSelf: 'flex-start', backgroundColor: colors.card, borderBottomLeftRadius: 4 },
  author: { color: colors.accent, fontWeight: '700', fontSize: 13 },
  time: { color: colors.muted, fontSize: 11, alignSelf: 'flex-end', opacity: 0.8 },
  composer: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
  },
  send: {
    width: 48,
    borderRadius: 14,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
