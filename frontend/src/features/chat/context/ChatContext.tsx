import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useMemo,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';

import { ChatContextType, Tab } from './ChatContext.types';
import {
  PaginatedResponseData,
  ChatEvent,
} from '@/api/types/chat.types';

import { useChatApi } from '../hooks/useChatApi';
import { useChatWebSocket } from '../hooks/useChatWebSocket';

const ChatContext = createContext<ChatContextType | null>(null);

interface ChatProviderProps {
  children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
  const router = useRouter();

  // --- Core State managed directly by Context ---
  const [messages, setMessages] = useState<ChatEvent[] | null>(null);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [currentMessage, setCurrentMessage] = useState<string>('');

  // --- Common Panel State ---
  const [isRightPanelVisible, setIsRightPanelVisible] = useState(false);
  const [isLeftPanelVisible, setIsLeftPanelVisible] = useState(true);

  // Custom wrapper for setIsRightPanelVisible to reset screenshot index when opening
  const setIsRightPanelVisibleWithReset = useCallback((visible: boolean | ((prev: boolean) => boolean)) => {
    const newVisible = typeof visible === 'function' ? visible(isRightPanelVisibleRef.current) : visible;
    
    // Reset to latest image (index 0) when opening the panel
    if (newVisible && !isRightPanelVisibleRef.current) {
      setCurrentScreenshotIndex(0);
    }
    
    setIsRightPanelVisible(newVisible);
  }, []);

  // --- Right Chat Panel State ---
  const [rightPanelNotificationCount, setRightPanelNotificationCount] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<Tab>('browser');
  const [currentScreenshotIndex, setCurrentScreenshotIndex] = useState(0);
  const [isLiveMode, setIsLiveMode] = useState(true); // Default to LIVE mode enabled
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  // Use refs to avoid dependency on isRightPanelVisible
  const isRightPanelVisibleRef = useRef(isRightPanelVisible);
  const isImageModalOpenRef = useRef(isImageModalOpen);
  const rightPanelNotificationCountRef = useRef(rightPanelNotificationCount);

  // Update refs when values change
  useEffect(() => {
    isRightPanelVisibleRef.current = isRightPanelVisible;
  }, [isRightPanelVisible]);

  useEffect(() => {
    isImageModalOpenRef.current = isImageModalOpen;
  }, [isImageModalOpen]);

  useEffect(() => {
    rightPanelNotificationCountRef.current = rightPanelNotificationCount;
  }, [rightPanelNotificationCount]);

  // Right panel notification functions
  const incrementRightPanelNotifications = useCallback(() => {
      if (isImageModalOpenRef.current) return;

      if (rightPanelNotificationCountRef.current === 0) {
        setIsRightPanelVisibleWithReset(true);
        setActiveTab('browser');
      }

      if(!isRightPanelVisibleRef.current) {
        setRightPanelNotificationCount(prev => prev + 1);
      }
  }, [setIsRightPanelVisibleWithReset, setActiveTab]);

  const clearRightPanelNotifications = useCallback(() => {
    setRightPanelNotificationCount(0);
  }, []);

  // --- API Hook ---
  const {
      chatListData,
      updateChatInList,
      loadingChats,
      loadingMessages,
      loadingMoreMessages,
      creatingChat,
      updatingChat,
      loadingMoreChats,
      chatsError,
      messagesError,
      createChatError,
      updateChatError,
      deletingChat,
      deleteChatError,
      deleteChat,
      screenshots,
      setScreenshots,
      loadingScreenshots,
      loadingMoreScreenshots,
      hasMoreScreenshots,
      screenshotsError,
      totalScreenshotsCount,
      setTotalScreenshotsCount,
      fetchChatList,
      fetchMoreChats,
      refreshChatList,
      fetchMessages,
      fetchMoreMessages,
      startNewChat,
      updateChat,
      refreshMessages,
      fetchScreenshots,
      fetchMoreScreenshots,
      resetScreenshots,
  } = useChatApi({
      messages,
      setMessages,
      setSelectedChatId
  });

  const {
      isConnected,
      connectionError,
      parseError,
      sendingMessage,
      sendMessageError,
      sendChatMessage: sendWsMessage,
      isThinking,
  } = useChatWebSocket({
      selectedChatId,
      setMessages,
      updateChatInList,
      setScreenshots,
      incrementRightPanelNotifications,
      updateTotalScreenshotsCount: setTotalScreenshotsCount,
      setCurrentScreenshotIndex,
      isLiveMode
  });

  const setCurrentMessageText = useCallback((text: string) => {
    setCurrentMessage(text);
  }, []);

  const selectChat = useCallback((id: string) => {
    if (id !== selectedChatId) {
        setSelectedChatId(id);
        setMessages(null);
        setCurrentScreenshotIndex(0); // Reset to latest screenshot when changing chats
    }

    if (Platform.OS !== 'web') {
      router.push(`/chat/${id}` as any);
    }
  }, [router, selectedChatId, setSelectedChatId]);

  useEffect(() => {
    if (selectedChatId) {
      fetchMessages(selectedChatId);
    } else {
      setMessages(null);
    }
  }, [selectedChatId, fetchMessages]);

  const sendMessage = useCallback(async () => {
    if (!currentMessage || !selectedChatId) return;

    // 1. Create temporary messages with ordered timestamps
    const now = new Date();
    const temporaryUserMessage: ChatEvent = {
        chat_id: selectedChatId,
        author: 'user',
        type: 'message',
        content: currentMessage,
        payload: null,
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
        _id: `temp-user-${now.getTime()}`,
    };

    const temporaryLoadingMessage: ChatEvent = {
      _id: `temp-thinking-${now.getTime()}`,
      chat_id: selectedChatId,
      author: 'agent',
      type: 'thinking',
      content: '',
      payload: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    // 2. Optimistically update the UI using inverted list: thinking then user
    setMessages((prev: ChatEvent[] | null) => [temporaryLoadingMessage, temporaryUserMessage, ...(prev || [])]);

    // 3. Clear the input field
    setCurrentMessage('');

    // 4. Send message to backend
    const result = await sendWsMessage({
      content: currentMessage,
      sender_type: 'user',
    });

    // 5. Handle send errors
    if (!result.success) {
      console.error("Failed to send message via WS:", result.error);
    }

  }, [sendWsMessage, currentMessage, setCurrentMessage, setMessages]);

  // Fetch chat list on mount
  useEffect(() => {
    fetchChatList();
  }, [fetchChatList]);

  // Wrapper for fetching more messages without args
  const fetchMoreMessagesContext = useCallback(() => {
    if (!selectedChatId) return;
    fetchMoreMessages(selectedChatId);
  }, [fetchMoreMessages, selectedChatId]);

  // Wrapper for refreshing messages without args
  const refreshMessagesContext = useCallback(() => {
    if (!selectedChatId) return;
    refreshMessages(selectedChatId);
  }, [refreshMessages, selectedChatId]);

  // --- Context Value ---
  const value = useMemo(() => {    
    const contextValue: ChatContextType = {
      // Context State
      chatListData,
      messages: messages,
      selectedChatId,
      currentMessage,
      isThinking,
      rightPanelNotificationCount,
      isRightPanelVisible,
      setIsRightPanelVisible: setIsRightPanelVisibleWithReset,
      isLeftPanelVisible,
      setIsLeftPanelVisible,
      // Right Chat Panel State
      activeTab,
      setActiveTab,
      currentScreenshotIndex,
      setCurrentScreenshotIndex,
      isLiveMode,
      setIsLiveMode,
      isImageModalOpen,
      setIsImageModalOpen,
      // API Hook State
      loadingChats,
      chatsError,
      loadingMessages,
      messagesError,
      creatingChat,
      createChatError,
      loadingMoreChats,
      loadingMoreMessages,
      updatingChat,
      updateChatError,
      deletingChat,
      deleteChatError,
      deleteChat,
      screenshots,
      setScreenshots,
      loadingScreenshots,
      loadingMoreScreenshots,
      hasMoreScreenshots,
      totalScreenshotsCount,
      screenshotsError,
      fetchScreenshots,
      fetchMoreScreenshots,
      resetScreenshots,
      // WebSocket Hook State
      isWsConnected: isConnected,
      wsConnectionError: connectionError,
      wsParseError: parseError,
      sendingMessage,
      sendMessageError,
      // Context Actions
      selectChat,
      sendMessage,
      setCurrentMessageText,
      setSelectedChatId,
      incrementRightPanelNotifications,
      clearRightPanelNotifications,
      // API Hook Actions
      startNewChat,
      updateChat,
      fetchChatList,
      refreshChatList,
      fetchMoreChats,
      fetchMessages,
      fetchMoreMessages: fetchMoreMessagesContext,
      refreshMessages: refreshMessagesContext,
    };
    return contextValue;
  }, [
    // Context State
    chatListData, messages, selectedChatId, currentMessage, isThinking, rightPanelNotificationCount, isLiveMode,
    // API Hook State/Actions
    loadingChats, chatsError, loadingMessages, messagesError, creatingChat,
    createChatError, loadingMoreChats, loadingMoreMessages, updatingChat, updateChatError,
    screenshots, setScreenshots, loadingScreenshots, loadingMoreScreenshots, hasMoreScreenshots, totalScreenshotsCount, screenshotsError, fetchScreenshots, fetchMoreScreenshots, resetScreenshots,
    fetchChatList, startNewChat, updateChat, fetchMoreChats, fetchMessages, fetchMoreMessages,
    refreshMessages, refreshChatList,
    // WebSocket Hook State
    isConnected, connectionError, parseError, sendingMessage, sendMessageError,
    // Context Actions / Hook Wrappers
    selectChat, sendMessage, setCurrentMessageText, setSelectedChatId,
    // Context wrapper functions
    fetchMoreMessagesContext, refreshMessagesContext,
    incrementRightPanelNotifications, clearRightPanelNotifications,
  ]);

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};
