import ChatScreen from '@/features/chat/ChatScreen';
import { ChatProvider } from '@/features/chat/context';

export default function ChatRoute() {
  return (
    <ChatProvider>
      <ChatScreen />
    </ChatProvider>
  );
} 