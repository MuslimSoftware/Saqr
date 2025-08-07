import React from 'react';
import { ChatEvent } from '@/api/types/chat.types';
import { TextMessage } from './messages/TextMessage';
import { ThinkingMessage } from './messages/ThinkingMessage';
import { ErrorMessage } from './messages/ErrorMessage';
import { ToolMessage } from './messages/ToolMessage';
import { ReasoningMessage } from './messages/ReasoningMessage';

interface MessageItemProps {
  item: ChatEvent;
  onToolInvocationPress?: (id: string) => void;
}

export const MessageItem: React.FC<MessageItemProps> = React.memo(({ item, onToolInvocationPress }) => {
  switch (item.type) {
    case 'message':
      return <TextMessage item={item} />;
    case 'thinking':
      return <ThinkingMessage item={item} />;
    case 'tool':
      return <ToolMessage item={item} />;
    case 'reasoning':
      return <ReasoningMessage item={item} />;
    case 'error':
      return <ErrorMessage item={item} />;
    default:
      return null;
  }
}); 