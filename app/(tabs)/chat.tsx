import { ChatRoom } from '@/components/ChatRoom';

/** Canal general de toda la comunidad. Cada skatepark tiene además su propio chat. */
export default function GeneralChatScreen() {
  return <ChatRoom parkId={null} />;
}
