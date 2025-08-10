import { useState, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';

import { useApi } from '@/api/useApi';
import { useApiPaginated } from '@/api/useApiPaginated';
import {
  Chat,
  CreateChatPayload,
  PaginatedResponseData,
  PaginationParams,
  ChatUpdatePayload,
  ScreenshotData,
  ChatEvent
} from '@/api/types/chat.types';
import { ApiError, ApiResponse } from '@/api/types/api.types';
import * as chatApi from '@/api/endpoints/chatApi';
import {
    CreateChatData,
    UpdateChatData,
} from '@/api/endpoints/chatApi';

// Define the props the hook needs
interface UseChatApiProps {
    messages: ChatEvent[] | null;
    setMessages: React.Dispatch<React.SetStateAction<ChatEvent[] | null>>;
    setSelectedChatId: React.Dispatch<React.SetStateAction<string | null>>;
}

export const useChatApi = ({
    messages,
    setMessages,
    setSelectedChatId
}: UseChatApiProps) => {
    const router = useRouter();

    const [hasMoreMessages, setHasMoreMessages] = useState<boolean>(false);
    const [nextCursorTimestamp, setNextCursorTimestamp] = useState<string | null>(null);

    // --- State for API loading/error/pagination ---
    const [loadingMoreMessages, setLoadingMoreMessages] = useState<boolean>(false);
    const [updatingChat, setUpdatingChat] = useState<boolean>(false);
    const [updateChatError, setUpdateChatError] = useState<ApiError | null>(null);

    // --- useApiPaginated Hook for Chats (Define BEFORE callbacks that use its methods) ---
    const { 
        data: chatListDataItems, 
        setData: setChatListItems,
        loading: loadingChats, 
        error: chatsError, 
        loadingMore: loadingMoreChats, 
        hasMore: hasMoreChats, 
        fetch: fetchChatList, 
        fetchMore: fetchMoreChats, 
        reset: resetChatList, 
        nextCursorTimestamp: chatListNextCursorTimestamp,
    } = useApiPaginated<Chat>(
        chatApi.getChats, 
        { 
            pageSize: 25, 
        }
    );

    const {
        data: screenshots,
        setData: setScreenshots,
        loading: loadingScreenshots,
        error: screenshotsError,
        loadingMore: loadingMoreScreenshots,
        hasMore: hasMoreScreenshots,
        fetch: fetchScreenshotsPaginated,
        fetchMore: fetchMoreScreenshotsPaginated,
        reset: resetScreenshotsState,
        totalItems: totalScreenshotsCount,
        setTotalItems: setTotalScreenshotsCount,
    } = useApiPaginated<ScreenshotData, [string]>(
        chatApi.getChatScreenshots,
        { 
            pageSize: 3,
        }
    );

    // --- API Callbacks ---
    const handleGetMessagesSuccess = useCallback((data: PaginatedResponseData<ChatEvent>, args: any[]) => {
        const isFetchingMore = !!args?.[1]?.before_timestamp;
        
        if (isFetchingMore) {
            // For loading more messages (older messages), append to the end for inverted list
            // but prevent duplicates
            setMessages(prev => {
                if (!prev || prev.length === 0) return data.items;
                
                // Only create Set if we have items to check
                if (data.items.length === 0) return prev;
                
                // Create a Set of existing message IDs for fast lookup
                const existingIds = new Set(prev.map(msg => msg._id));
                
                // Filter out any messages that already exist
                const newMessages = data.items.filter(msg => !existingIds.has(msg._id));
                
                if (newMessages.length === 0) {
                    return prev;
                }
                
                return [...prev, ...newMessages];
            });
            setLoadingMoreMessages(false);
        } else {
            // For initial fetch, replace all messages
            setMessages(data.items);
        }
        
        setHasMoreMessages(data.has_more);
        setNextCursorTimestamp(data.next_cursor_timestamp);
    }, [setMessages]);

    const handleGetMessagesError = useCallback((error: ApiError, args: any[]) => {
         const isFetchingMore = !!args?.[1]?.before_timestamp;
         console.error(`Error fetching messages${isFetchingMore ? ' (more)' : ''} for chat ${args?.[0]}:`, error);
         if (isFetchingMore) {
           setLoadingMoreMessages(false);
         }
    }, []);

    // Keep create/update chat handlers (Now fetchChatList is defined)
    const handleCreateChatSuccess = useCallback((newChatData: CreateChatData) => {
        fetchChatList();
        setSelectedChatId(newChatData._id);
        if (Platform.OS !== 'web') {
            router.push(`/chat/${newChatData._id}` as any);
        }
    }, [fetchChatList, setSelectedChatId, router]);
    
    const handleCreateChatError = useCallback((error: ApiError) => {
        console.error("Error creating chat:", error);
    }, []);

    const handleUpdateChatSuccess = useCallback((updatedChatData: UpdateChatData) => {
        fetchChatList();
        setUpdatingChat(false);
        setUpdateChatError(null);
    }, [fetchChatList]);

    const handleUpdateChatError = useCallback((error: ApiError) => {
        console.error("Error updating chat:", error);
        setUpdateChatError(error);
        setUpdatingChat(false);
    }, []);

    const handleDeleteChatSuccess = useCallback((data: void, args: any[]) => {
        const deletedChatId = args[0] as string;
        // Remove the deleted chat from the list
        setChatListItems((prev: Chat[]) => prev.filter(chat => chat._id !== deletedChatId));
        // If the deleted chat was selected, clear selection
        setSelectedChatId(prev => prev === deletedChatId ? null : prev);
    }, [setChatListItems, setSelectedChatId]);

    const handleDeleteChatError = useCallback((error: ApiError) => {
        console.error("Error deleting chat:", error);
    }, []);

    // --- Other useApi Hooks Initialization ---
    const { execute: fetchMessagesApi, loading: loadingMessages, error: messagesError, reset: resetMessagesError }
        = useApi<PaginatedResponseData<ChatEvent>, [string, PaginationParams?]>(chatApi.getChatMessages, {
        onSuccess: handleGetMessagesSuccess,
        onError: handleGetMessagesError,
    });

    const { execute: createChatApi, loading: creatingChat, error: createChatError, reset: resetCreateChatError }
        = useApi<CreateChatData, [CreateChatPayload]>(chatApi.createChat, {
        onSuccess: handleCreateChatSuccess,
        onError: handleCreateChatError,
    });

    const { execute: updateChatApi, reset: resetUpdateChatError }
        = useApi<UpdateChatData, [string, ChatUpdatePayload]>(chatApi.updateChat, {
        onSuccess: handleUpdateChatSuccess,
        onError: handleUpdateChatError,
    });

    const { execute: deleteChatApi, loading: deletingChat, error: deleteChatError, reset: resetDeleteChatError }
        = useApi<void, [string]>(chatApi.deleteChat, {
        onSuccess: handleDeleteChatSuccess,
        onError: handleDeleteChatError,
    });
    
    const fetchMessages = useCallback((chatId: string) => {
        resetMessagesError();
        setMessages([]);
        setHasMoreMessages(false);
        setNextCursorTimestamp(null);
        setLoadingMoreMessages(false);
        fetchMessagesApi(chatId, {});
    }, [fetchMessagesApi, resetMessagesError, setMessages]);

    const refreshMessages = useCallback((chatId: string) => {
        if (!chatId) return;
        resetMessagesError(); // Reset errors
        fetchMessagesApi(chatId, {}); 
    }, [fetchMessagesApi, resetMessagesError]);

    const fetchMoreMessages = useCallback((chatId: string) => {
        // Enhanced checks to prevent race conditions and invalid states
        if (!chatId || loadingMessages || loadingMoreMessages || !hasMoreMessages || !nextCursorTimestamp) {
            return;
        }

        setLoadingMoreMessages(true);
        fetchMessagesApi(chatId, { before_timestamp: nextCursorTimestamp });
    }, [loadingMessages, loadingMoreMessages, hasMoreMessages, nextCursorTimestamp, fetchMessagesApi]);
   
    const startNewChat = useCallback(async () => {
        resetCreateChatError();
        try {
            await createChatApi({ name: 'New Chat' });
        } catch (e) {
            console.log("Create chat caught exception (already handled by useApi):", e)
        }
    }, [createChatApi, resetCreateChatError]);

    const updateChat = useCallback(async (chatId: string, payload: ChatUpdatePayload) => {
        setUpdatingChat(true);
        setUpdateChatError(null);
        resetUpdateChatError();
        try {
            await updateChatApi(chatId, payload);
        } catch (e) { 
            console.log("Update chat caught exception (already handled by useApi):", e)
        }
    }, [updateChatApi, resetUpdateChatError]);

    const deleteChat = useCallback(async (chatId: string) => {
        resetDeleteChatError();
        try {
            await deleteChatApi(chatId);
        } catch (e) {
            console.log("Delete chat caught exception (already handled by useApi):", e)
        }
    }, [deleteChatApi, resetDeleteChatError]);

    // --- MODIFIED Action to fetch screenshots --- 
    const fetchScreenshots = useCallback(async (chatId: string) => {
        if (!chatId) return;
        try {
            resetScreenshotsState();
            await fetchScreenshotsPaginated([chatId], {}); 
        } catch (e) {
            console.error("Error fetching initial screenshots:", e); 
        }
    }, [fetchScreenshotsPaginated, resetScreenshotsState]);

    // --- MODIFIED Action to fetch more screenshots ---
    const fetchMoreScreenshots = useCallback(async (): Promise<{ items: ScreenshotData[], total_items: number | null } | null> => {
        try {
            const fullResponse = await fetchMoreScreenshotsPaginated();
             if (fullResponse?.data) {
              return {
                items: fullResponse.data.items,
                total_items: fullResponse.data.total_items ?? null
              };
            }
            return null;
        } catch (e) {
             console.error("Error fetching more screenshots:", e);
             return null;
        }
    }, [fetchMoreScreenshotsPaginated]);

    // --- MODIFIED Action to reset screenshots state --- 
    const resetScreenshots = useCallback(() => {
         resetScreenshotsState();
    }, [resetScreenshotsState]);

    // --- Memoize the chat list data object --- 
    const memoizedChatListData = useMemo(() => ({
        items: chatListDataItems || [],
        has_more: hasMoreChats,
        next_cursor_timestamp: chatListNextCursorTimestamp,
    }), [chatListDataItems, hasMoreChats, chatListNextCursorTimestamp]);

    // --- Function to update chat list data ---
    const updateChatInList = useCallback((chatId: string, updates: Partial<Chat>) => {
        setChatListItems((prev: Chat[]) => {
            const chatIndex = prev.findIndex((chat) => chat._id === chatId);
            if (chatIndex !== -1) {
                const updatedChats = [...prev];
                updatedChats[chatIndex] = {
                    ...updatedChats[chatIndex],
                    ...updates,
                };
                return updatedChats;
            }
            return prev;
        });
    }, [setChatListItems]);

    // --- Refresh chat list without resetting pagination ---
    const refreshChatList = useCallback(async () => {
        try {
            await fetchChatList([], {}, true); // isRefresh = true
        } catch (e) {
            console.error("Error refreshing chat list:", e);
        }
    }, [fetchChatList]);

    // --- Return Values ---
    return {
        chatListData: memoizedChatListData, 
        updateChatInList,
        loadingChats,
        chatsError,
        loadingMoreChats,
        fetchChatList,
        fetchMoreChats,
        refreshChatList,
        resetChatList,
        loadingMessages,
        messagesError,
        fetchMessages,
        fetchMoreMessages,
        loadingMoreMessages,
        creatingChat,
        createChatError,
        startNewChat,
        updatingChat,
        updateChatError,
        updateChat,
        deletingChat,
        deleteChatError,
        deleteChat,
        refreshMessages,
        screenshots, 
        setScreenshots,
        loadingScreenshots,
        screenshotsError,
        loadingMoreScreenshots,
        hasMoreScreenshots,
        fetchScreenshots, 
        fetchMoreScreenshots,
        resetScreenshots,
        totalScreenshotsCount,
        setTotalScreenshotsCount,
    };
}; 