import { Stack, useLocalSearchParams } from 'expo-router';

import { ChatRoom } from '@/components/ChatRoom';

export default function ParkChatScreen() {
  const { room, name } = useLocalSearchParams<{ room: string; name?: string }>();
  return (
    <>
      <Stack.Screen options={{ title: name ? `Chat · ${name}` : 'Chat' }} />
      <ChatRoom parkId={room} />
    </>
  );
}
