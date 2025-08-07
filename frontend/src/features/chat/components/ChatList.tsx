import React, { memo, useState } from 'react';
import {
  StyleSheet,
  Pressable,
  View,
  Platform,
} from 'react-native';
import { TextBody, TextSubtitle } from '@/features/shared/components/text';
import { paddings, borderRadii, gaps } from '@/features/shared/theme/spacing';
import { Theme, useTheme } from '@/features/shared/context/ThemeContext';
import { useChat } from '../context';
import { Chat } from '@/api/types/chat.types';
import { formatTimestamp } from '@/features/shared/utils';
import { BaseFlatList } from '@/features/shared/components/layout/lists';
import { ChatItemMenu } from './ChatItemMenu';
import { ChatDeleteConfirmModal } from './ChatDeleteConfirmModal';

const ChatListComponent: React.FC = () => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null);
  const [chatToDelete, setChatToDelete] = useState<Chat | null>(null);
  const { 
      chatListData,
      selectedChatId, 
      selectChat, 
      loadingChats,
      chatsError,
      loadingMoreChats,
      fetchMoreChats,
      refreshChatList,
      deleteChat,
      deletingChat,
  } = useChat();

  const handleDeletePress = (chat: Chat) => {
    setChatToDelete(chat);
  };

  const handleConfirmDelete = () => {
    if (chatToDelete) {
      deleteChat(chatToDelete._id);
      setChatToDelete(null);
    }
  };

  const handleCancelDelete = () => {
    setChatToDelete(null);
  };

  const renderChatItem = ({ item }: { item: Chat }) => {
    const formattedTime = formatTimestamp(item.latest_message_timestamp);
    const isDeleting = deletingChat && chatToDelete?._id === item._id;
    const isHovered = hoveredChatId === item._id;

    // Create handlers for hover events
    const handleMouseEnter = () => {
      if (Platform.OS === 'web') {
        setHoveredChatId(item._id);
      }
    };

    const handleMouseLeave = () => {
      if (Platform.OS === 'web') {
        setHoveredChatId(null);
      }
    };

    return (
      <View 
        style={styles.chatItemWrapper}
        // Web-specific mouse events
        {...(Platform.OS === 'web' && {
          onMouseEnter: handleMouseEnter,
          onMouseLeave: handleMouseLeave,
        })}
      >
      <Pressable 
        key={item._id}
        style={[
          styles.chatListItem,
          item._id === selectedChatId && styles.chatListItemSelected
        ]}
        onPress={() => selectChat(item._id)}
      >
          <View style={styles.chatItemContent}>
            {/* First Row: Chat name + icons */}
            <View style={styles.firstRow}>
            <TextBody numberOfLines={1} style={styles.chatListName}>
              {item.name || 'Chat'}
            </TextBody>
                <ChatItemMenu 
                  onDeletePress={() => handleDeletePress(item)}
                  isDeleting={isDeleting}
                  isVisible={Platform.OS !== 'web' || isHovered}
                />
            </View>

            {/* Second Row: Latest message + time */}
            {item.latest_message_content ? (
              <View style={styles.secondRow}>
                <TextSubtitle 
                  color={theme.colors.text.secondary} 
                  numberOfLines={1}
                  style={styles.latestMessage}
                >
                    {item.latest_message_content}
                </TextSubtitle>
                {formattedTime ? (
            <TextSubtitle color={theme.colors.text.secondary} style={styles.timestamp}>
              {formattedTime}
            </TextSubtitle>
                ) : null}
              </View>
            ) : null}
        </View>
      </Pressable>
      </View>
    );
  };

  return (
    <>
    <BaseFlatList<Chat>
      data={chatListData?.items ?? []}
      isLoading={loadingChats}
      isError={!!chatsError}
      error={chatsError}
      isEmpty={!chatListData?.items || chatListData.items.length === 0}
      emptyStateMessage="No chats yet."
      isLoadingMore={loadingMoreChats}
      onEndReached={fetchMoreChats}
      onRefresh={refreshChatList}
      renderItem={renderChatItem}
      keyExtractor={(item: Chat) => item._id}
      contentContainerStyle={styles.chatListContainer}
      onEndReachedThreshold={0.5}
    />
      <ChatDeleteConfirmModal
        isVisible={!!chatToDelete}
        chatName={chatToDelete?.name}
        onConfirm={handleConfirmDelete}
        onCancel={handleCancelDelete}
        isDeleting={deletingChat}
      />
    </>
  );
};

export const ChatList = memo(ChatListComponent);

const getStyles = (theme: Theme) => StyleSheet.create({
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: paddings.large,
  },
  chatListContainer: {
    paddingBottom: paddings.medium,
    paddingTop: paddings.small,
  },
  chatItemWrapper: {
    position: 'relative',
  },
  chatListItem: {
    paddingVertical: paddings.small,
    paddingHorizontal: paddings.medium,
    marginBottom: gaps.xsmall,
    borderRadius: borderRadii.medium,
    marginHorizontal: paddings.small,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  chatListItemSelected: {
    backgroundColor: theme.colors.layout.foreground,
    borderColor: theme.colors.layout.border,
  },
  chatItemContent: {
    flex: 1,
    gap: gaps.xsmall,
  },
  firstRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  secondRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: gaps.small,
    alignItems: 'center',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: gaps.small,
  },
  chatListName: {
    fontWeight: 'bold',
    flex: 1,
  },
  latestMessage: {
    flex: 1,
  },
  timestamp: {
    fontSize: 12,
    flexShrink: 0,
  },
  loadingMoreContainer: {
    paddingVertical: paddings.medium,
    alignItems: 'center',
  }
}); 