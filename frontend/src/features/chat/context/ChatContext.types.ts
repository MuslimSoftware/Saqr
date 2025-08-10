import { Chat, PaginatedResponseData, ChatUpdatePayload, ScreenshotData, ChatEvent } from '@/api/types/chat.types';
import { ApiError } from '@/api/types/api.types';
import { Dispatch, SetStateAction } from 'react';

export type Tab = 'browser' | 'tool_calls';

export interface ChatState {
  chatListData: PaginatedResponseData<Chat> | null;
  messages: ChatEvent[] | null;
  selectedChatId: string | null;
  currentMessage: string;
  loadingChats: boolean;
  loadingMessages: boolean;
  creatingChat: boolean;
  chatsError: ApiError | null;
  messagesError: ApiError | null;
  createChatError: ApiError | null;
  loadingMoreChats: boolean;
  loadingMoreMessages: boolean;
  isWsConnected: boolean;
  wsConnectionError: string | Event | null;
  wsParseError: Error | null;
  sendingMessage: boolean;
  sendMessageError: ApiError | null;
  updatingChat: boolean;
  updateChatError: ApiError | null;
  deletingChat: boolean;
  deleteChatError: ApiError | null;
  screenshots: ScreenshotData[];
  setScreenshots: (screenshots: ScreenshotData[]) => void;
  loadingScreenshots: boolean;
  screenshotsError: ApiError | null;
  loadingMoreScreenshots: boolean;
  hasMoreScreenshots: boolean;
  totalScreenshotsCount: number | null;
  isThinking: boolean;
  rightPanelNotificationCount: number;
  isRightPanelVisible: boolean;
  setIsRightPanelVisible: Dispatch<SetStateAction<boolean>>;
  isLeftPanelVisible: boolean;
  setIsLeftPanelVisible: Dispatch<SetStateAction<boolean>>;
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;
  currentScreenshotIndex: number;
  setCurrentScreenshotIndex: Dispatch<SetStateAction<number>>;
  isLiveMode: boolean;
  setIsLiveMode: Dispatch<SetStateAction<boolean>>;
  isImageModalOpen: boolean;
  setIsImageModalOpen: Dispatch<SetStateAction<boolean>>;
}

export interface ChatContextType extends ChatState {
  selectChat: (id: string) => void;
  sendMessage: () => Promise<void>;
  setCurrentMessageText: (text: string) => void;
  startNewChat: () => Promise<void>;
  updateChat: (chatId: string, payload: ChatUpdatePayload) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  fetchChatList: () => void;
  refreshChatList: () => void;
  fetchMoreChats: () => void;
  fetchMessages: (chatId: string) => void;
  fetchMoreMessages: () => void;
  refreshMessages: () => void;
  fetchScreenshots: (chatId: string) => Promise<void>;
  setSelectedChatId: (id: string | null) => void;
  fetchMoreScreenshots: () => Promise<{ items: ScreenshotData[], total_items: number | null } | null>;
  resetScreenshots: () => void;
  incrementRightPanelNotifications: () => void;
  clearRightPanelNotifications: () => void;
}