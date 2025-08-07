import React, { useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View, Text, FlatList } from 'react-native';
import { useTheme } from '@/features/shared/context/ThemeContext';
import { paddings } from '@/features/shared/theme/spacing';
import { BaseFlatList } from '@/features/shared/components/layout/lists';
import { ChatEvent, ToolPayload, ToolExecution } from '@/api/types/chat.types';
import { ToolCallListItem } from '../messages/ToolCallListItem';
import { useChat } from '../../context';

interface ToolCallsTabProps {
  scrollToInvocationId?: string | null;
  highlightInvocationId?: string | null;
}

interface ToolCallWithSource {
  toolCall: ToolExecution;
  sourceMessageId: string;
  toolCallIndex: number;
}

export const ToolCallsTab: React.FC<ToolCallsTabProps> = ({ scrollToInvocationId, highlightInvocationId }) => {
  const { theme } = useTheme();
  const { messages } = useChat();

  // Extract individual tool calls from all tool messages
  const individualToolCalls = useMemo(() => {
    const calls: ToolCallWithSource[] = [];
    
    messages?.forEach(message => {
      if (message.type === 'tool' && message.payload) {
        const toolPayload = message.payload as ToolPayload;
        if (toolPayload.tool_calls && toolPayload.tool_calls.length > 0) {
          toolPayload.tool_calls.forEach((toolCall, index) => {
            calls.push({
              toolCall,
              sourceMessageId: message._id,
              toolCallIndex: index
            });
          });
        }
      }
    });
    
    return calls;
  }, [messages]);

  // Reference to FlatList for scrolling
  const flatListRef = useRef<FlatList<ToolCallWithSource>>(null);

  // Scroll to selected invocation when requested
  useEffect(() => {
    if (scrollToInvocationId && flatListRef.current) {
      const index = individualToolCalls.findIndex(item => item.sourceMessageId === scrollToInvocationId);
      if (index >= 0) {
        flatListRef.current.scrollToIndex({ index, animated: true });
      }
    }
  }, [scrollToInvocationId, individualToolCalls]);

  const renderItem = ({ item }: { item: ToolCallWithSource }) => {
    const isHighlighted = item.sourceMessageId === highlightInvocationId;
    
    return (
      <ToolCallListItem 
        toolCall={item.toolCall}
        isHighlighted={isHighlighted}
      />
    );
  };

  const getItemKey = (item: ToolCallWithSource) => 
    `${item.sourceMessageId}-${item.toolCallIndex}`;

  return (
    <BaseFlatList<ToolCallWithSource>
      ref={flatListRef}
      data={individualToolCalls}
      renderItem={renderItem}
      keyExtractor={getItemKey}
      contentContainerStyle={styles.container}
      isLoading={false}
      isError={false}
      isEmpty={individualToolCalls.length === 0}
      emptyStateMessage="No tool calls yet"
      isLoadingMore={false}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
  },
  emptyText: {
    flex: 1,
    textAlign: 'center',
    marginTop: paddings.large,
  },
}); 