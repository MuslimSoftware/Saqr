import { useEffect, useState, useCallback, useRef } from 'react';
import { config } from '@/config/environment.config';
import { getDemoToken } from '@/config/storage.config';
import { useWebSocket } from '@/api/useWebSocket';
import {
  CreateMessagePayload,
  PaginatedResponseData,
  ChatEvent,
  ToolPayload,
  ReasoningPayload,
  Chat,
  ScreenshotData,
} from '@/api/types/chat.types';
import { ApiError } from '@/api/types/api.types';
import type { Dispatch, SetStateAction } from 'react';

export interface UseChatWebSocketProps {
  selectedChatId: string | null;
  setMessages: Dispatch<SetStateAction<ChatEvent[] | null>>;
  updateChatInList: (chatId: string, updates: Partial<Chat>) => void;
  setScreenshots: Dispatch<SetStateAction<ScreenshotData[]>>;
  incrementRightPanelNotifications: () => void;
  updateTotalScreenshotsCount?: (count: number) => void;
  setCurrentScreenshotIndex?: Dispatch<SetStateAction<number>>;
  isLiveMode: boolean;
}

export const useChatWebSocket = ({
  selectedChatId,
  setMessages,
  updateChatInList,
  setScreenshots,
  incrementRightPanelNotifications,
  updateTotalScreenshotsCount,
  setCurrentScreenshotIndex,
  isLiveMode
}: UseChatWebSocketProps) => {
  const isLiveRef = useRef(isLiveMode);
  useEffect(() => { isLiveRef.current = isLiveMode; }, [isLiveMode]);
  const [wsUrl, setWsUrl] = useState<string | null>(null);
  const [parseError, setParseError] = useState<Error | null>(null);
  const [sendingMessage, setSendingMessage] = useState<boolean>(false);
  const [sendMessageError, setSendMessageError] = useState<ApiError | null>(null);
  const [isThinking, setIsThinking] = useState<boolean>(false);

  // Update WebSocket URL when selectedChatId changes
  useEffect(() => {
    let mounted = true;
    if (selectedChatId) {
      const token = getDemoToken();
      if (mounted && token) {
        const wsBaseUrl = config.FE_API_URL.replace(/^http/, 'ws');
        const newUrl = `${wsBaseUrl}/chats/ws/${selectedChatId}?token=${encodeURIComponent(token)}`;
        setWsUrl(newUrl);
      } else {
        console.error('[useChatWebSocket] No demo token available');
      }
    } else {
      setWsUrl(null);
    }
    return () => {
      mounted = false;
    };
  }, [selectedChatId]);

  // Handle incoming ChatEvent messages and invocations
  const handleChatMessage = useCallback(
    (data: any) => {
      setParseError(null);
      
      // Handle chat title updates
      if (data.type === 'chat_title_updated') {
        updateChatInList(data.data.chat_id, {
          name: data.data.title,
          updated_at: data.data.updated_at,
        });
        return;
      }

      if (data.type === 'screenshot_captured') {
        setScreenshots((prev: ScreenshotData[]) => {
          const newScreenshots = [data.data.screenshot, ...prev];
          // Update total count if function is provided
          if (updateTotalScreenshotsCount) {
            updateTotalScreenshotsCount(newScreenshots.length);
          }
          return newScreenshots;
        });
        
        // Adjust current screenshot index based on LIVE mode
        if (setCurrentScreenshotIndex) {
          if (isLiveRef.current) {
            // In LIVE mode, always show the latest screenshot (index 0)
            setCurrentScreenshotIndex(0);
          } else {
            // Not in LIVE mode, shift index to maintain current position
            setCurrentScreenshotIndex(prev => prev + 1);
          }
        }
        
        // Increment notification count when screenshot is received
        incrementRightPanelNotifications();
        
        return;
      }
      
      // Only handle standardized ChatEvent shapes
      if (data.type !== 'message' && data.type !== 'tool' && data.type !== 'reasoning') {
        console.warn('[useChatWebSocket] Unknown event type:', data.type);
        return;
      }

      const event: ChatEvent = {
        _id: data._id,
        chat_id: data.chat_id,
        author: data.author,
        type: data.type,
        content: data.content,
        payload: data.payload as ToolPayload | ReasoningPayload | null,
        created_at: data.created_at,
        updated_at: data.updated_at,
      };

      // Update chat's latest message fields for relevant message types (exclude reasoning)
      if (event.type !== 'reasoning') {
        updateChatInList(event.chat_id, {
          latest_message_content: event.content,
          latest_message_timestamp: event.created_at,
          updated_at: event.updated_at,
        });
      }

      setMessages((prev: ChatEvent[] | null) => {
        if (!prev) {
          return [event];
        }

        // Replace temporary message with real one
        if (event.author === 'user') {
          const tempMessageIndex = prev.findIndex((msg) => msg._id.startsWith('temp-user-'));
          prev[tempMessageIndex] = event;

          return [...prev];
        } 
        
        // Delete the temporary thinking message
        const tempMessageIndex = prev.findIndex((msg) => msg._id.startsWith('temp-thinking-'));
        if (event.author === 'agent' && tempMessageIndex !== -1) {          
          prev.splice(tempMessageIndex, 1);
        }

        // Replace existing events (for tool and reasoning updates)
        if (event.type === 'tool' || event.type === 'reasoning') {
          const existingEventIndex = prev.findIndex((msg) => msg._id === event._id);
          if (existingEventIndex !== -1) {
            prev[existingEventIndex] = event;
            return [...prev];
          }
        }

        setIsThinking(false);

        return [event, ...prev];
      });
    },
    [setMessages, setIsThinking, updateChatInList, incrementRightPanelNotifications, updateTotalScreenshotsCount, setCurrentScreenshotIndex]
  );

  const wsHandler = useCallback(
    (event: MessageEvent) => {
      try {
        const parsed = JSON.parse(event.data);
        handleChatMessage(parsed);
      } catch (error) {
        console.error('[useChatWebSocket] parse error:', error);
        setParseError(error instanceof Error ? error : new Error('Failed to parse message'));
      }
    },
    [handleChatMessage]
  );

  const { isConnected, error: connectionError, sendMessage } = useWebSocket(wsUrl, {
    onMessage: wsHandler,
  });

  const sendChatMessage = useCallback(
    async (payload: CreateMessagePayload): Promise<{ success: boolean; error?: string }> => {
      setSendingMessage(true);
      setSendMessageError(null);
      setIsThinking(true);
      
      try {
        if (!isConnected) {
          console.log('[useChatWebSocket] Not connected, sendMessage will attempt reconnection...');
        }

        // sendMessage now returns a Promise<boolean>
        const success = await sendMessage(JSON.stringify(payload));
        
        if (success) {
          return { success: true };
        } else {
          throw new Error('Failed to send message - WebSocket error or reconnection failed');
        }
      } catch (error) {
        console.error('[useChatWebSocket] send error:', error);
        setIsThinking(false); // Reset thinking state on error
        
        const apiError: ApiError = {
          message: error instanceof Error ? error.message : String(error),
          error_code: 'WS_SEND_ERROR',
          status_code: 0,
        };
        setSendMessageError(apiError);
        return { success: false, error: apiError.error_code };
      } finally {
        setSendingMessage(false);
      }
    },
    [isConnected, sendMessage],
  );

  return {
    isConnected,
    connectionError,
    parseError,
    sendingMessage,
    sendMessageError,
    sendChatMessage,
    isThinking,
  };
}; 