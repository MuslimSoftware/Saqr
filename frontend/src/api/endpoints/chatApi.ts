import { apiClient as api } from '@/api/client'
import { ApiResponse } from '@/api/types/api.types'

import { 
  Chat, 
  CreateChatPayload,
  ChatUpdatePayload,
  CreateMessagePayload,
  PaginationParams,
  GetChatsResponse,
  GetChatDetailsResponse,
  GetChatEventsResponse,
  CreateChatResponse,
  AddMessageResponse,
  ScreenshotData,
  PaginatedResponseData,
  ChatEvent
} from '../types/chat.types'

// === Chat Endpoints ===

// Type hints for the actual data returned by the API calls
// (useful for useApi hook generics)
export type GetChatsData = PaginatedResponseData<Chat>
export type GetChatDetailsData = Chat
export type CreateChatData = Chat
export type AddMessageData = AddMessageResponse
// Deprecated: old alias for message responses
// export type GetChatMessagesData = PaginatedResponseData<Message>
export type UpdateChatData = Chat

// === Screenshot Endpoint ===

// Type hint for the actual data returned
export type GetScreenshotsData = PaginatedResponseData<ScreenshotData>;

// Response type using BaseResponse
export type GetChatScreenshotsResponse = ApiResponse<GetScreenshotsData>;

// Helper to build query string safely
const buildQueryString = (params?: PaginationParams): string => {
    if (!params) return '';
    const query = new URLSearchParams();
    if (params.limit !== undefined) {
        query.append('limit', String(params.limit));
    }
    if (params.before_timestamp) {
        query.append('before_timestamp', params.before_timestamp);
    }
    const queryString = query.toString();
    return queryString ? `?${queryString}` : '';
};

const CHAT_API_PREFIX = '/chats'; // Matches backend router prefix

/**
 * Fetches a paginated list of chats for the user.
 */
export const getChats = async (params?: PaginationParams): Promise<GetChatsResponse> => {
  const queryString = buildQueryString(params);
  // Pass the inner data type to the generic
  return api.get<GetChatsData>(`${CHAT_API_PREFIX}/${queryString}`);
}

/**
 * Fetches the details of a specific chat (excluding messages).
 */
export const getChatDetails = async (chatId: string): Promise<GetChatDetailsResponse> => {
  // Pass the inner data type to the generic
  return api.get<GetChatDetailsData>(`${CHAT_API_PREFIX}/${chatId}`);
}

/**
 * Fetches a paginated list of chat events (messages & invocations) for a specific chat.
 */
export const getChatMessages = async (
  chatId: string,
  params?: PaginationParams
): Promise<GetChatEventsResponse> => {
  const queryString = buildQueryString(params);
  return api.get<PaginatedResponseData<ChatEvent>>(
    `${CHAT_API_PREFIX}/${chatId}/messages${queryString}`
  );
}

/**
 * Creates a new chat.
 */
export const createChat = async (payload: CreateChatPayload): Promise<CreateChatResponse> => {
  // Pass the inner data type to the generic
  return api.post<CreateChatData>(`${CHAT_API_PREFIX}/`, payload);
}

/**
 * Updates a chat's name and/or subtitle.
 */
export const updateChat = async (chatId: string, payload: ChatUpdatePayload): Promise<GetChatDetailsResponse> => { 
    return api.patch<UpdateChatData>(`${CHAT_API_PREFIX}/${chatId}`, payload);
}

/**
 * Fetches screenshots for a specific chat.
 * Assumes backend supports sorting and cursor-based pagination.
 */
export const getChatScreenshots = async (chatId: string, params: PaginationParams): Promise<GetChatScreenshotsResponse> => {
  // Restore query string building
  const queryString = buildQueryString(params); 
  // Pass the correct inner data type (PaginatedResponseData<ScreenshotData>) to the generic
  return api.get<GetScreenshotsData>(`${CHAT_API_PREFIX}/${chatId}/screenshots${queryString}`);
}

/**
 * Deletes a chat and all its related data.
 */
export const deleteChat = async (chatId: string): Promise<ApiResponse<void>> => {
  return api.delete<void>(`${CHAT_API_PREFIX}/${chatId}`);
}