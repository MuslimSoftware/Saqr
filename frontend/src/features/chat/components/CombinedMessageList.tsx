import React, { useMemo, useRef, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChatEvent } from '@/api/types/chat.types';
import { MessageItem } from './MessageItem';
import { useTheme } from '@/features/shared/context/ThemeContext';
import { paddings } from '@/features/shared/theme/spacing';
import { BaseFlatList } from '@/features/shared/components/layout/lists';
import { useChatApi } from '../hooks/useChatApi';
import { useChat } from '../context';
import { Brand } from '@/features/shared/components/brand/Brand';
import { ThinkingMessage } from './messages/ThinkingMessage';
import { ChatLoadingSkeletons } from './skeletons/ChatLoadingSkeletons';

interface CombinedMessageListProps {
  onEndReached?: () => void;
  onToolInvocationPress?: (id: string) => void;
}

export const CombinedMessageList: React.FC<CombinedMessageListProps> = ({ onEndReached, onToolInvocationPress }) => {
  const { theme } = useTheme();
  const {
    messages, 
    isThinking, 
    loadingMessages, 
    loadingMoreMessages, 
    messagesError,
    fetchMoreMessages 
  } = useChat();

  // Add ref to track last call time for throttling
  const lastEndReachedCall = useRef<number>(0);

  // Memoize the renderItem function to prevent recreating it on every render
  const renderItem = useCallback(({ item, index }: { item: ChatEvent; index: number }) => {
    const nextItem = index < messages!.length - 1 ? messages![index + 1] : null;
    const isCurrentAgentOrTool = item.author === 'agent' || item.type === 'tool';
    const isNextUser = nextItem?.author === 'user';
    const showBrand = isCurrentAgentOrTool && isNextUser;

    return (
      <View style={styles.row}>
        {showBrand ? <Brand /> : null}
        <MessageItem item={item} onToolInvocationPress={onToolInvocationPress} />
      </View>
    );
  }, [messages, onToolInvocationPress]);

  // Memoize the handleEndReached function
  const handleEndReached = useCallback(() => {
    // Throttle rapid calls to prevent multiple requests
    const now = Date.now();
    if (now - lastEndReachedCall.current < 1000) {
      return;
    }
    lastEndReachedCall.current = now;
    
    // Call the passed onEndReached prop if available, otherwise use fetchMoreMessages
    if (onEndReached) {
      onEndReached();
    } else {
      fetchMoreMessages();
    }
  }, [onEndReached, fetchMoreMessages]);

  if ((loadingMessages && !loadingMoreMessages) || !messages) {
    return <ChatLoadingSkeletons />;
  }

  if (messages.length === 0) {
    return (
      <Text style={[styles.emptyText, { color: theme.colors.text.secondary }]}>
        No messages yet
      </Text>
    );
  }

  return (
    <BaseFlatList<ChatEvent>
      style={{ flex: 1 }}
      data={messages}
      renderItem={renderItem}
      keyExtractor={(item: ChatEvent) => item._id}
      onEndReached={handleEndReached}
      onEndReachedThreshold={0.5}
      inverted={true}
      contentContainerStyle={styles.container}
      removeClippedSubviews={false}
      maintainVisibleContentPosition={{
        minIndexForVisible: 0,
        autoscrollToTopThreshold: 10,
      }}
      maxToRenderPerBatch={10}
      windowSize={21}
      initialNumToRender={10}
      updateCellsBatchingPeriod={50}
      getItemLayout={undefined}
      isEmpty={messages.length === 0}
      emptyStateMessage="No messages yet"
      isLoading={false}
      isError={false}
      error={null}
      isLoadingMore={loadingMoreMessages}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: paddings.medium,
    paddingTop: paddings.medium,
  },
  emptyText: {
    flex: 1,
    textAlign: 'center',
  },
  row: {
  },
}); 