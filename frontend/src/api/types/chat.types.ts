import { ApiResponse } from './api.types';

export type AuthorType = 'user' | 'agent';
export type ChatEventType = 'message' | 'tool' | 'reasoning' | 'error' | 'thinking';
export type ToolStatus = 'started' | 'in_progress' | 'completed' | 'error';

// --- Core Event Types ---
export type ReasoningPayload = {
  trajectory: string[];
  status: 'thinking' | 'complete';
};

export type ToolExecution = {
  tool_name: string;
  input_payload: Record<string, unknown>;
  output_payload?: Record<string, unknown> | null;
  error?: string | null;
  status: ToolStatus;
  started_at: string;
  completed_at?: string | null;
};

export type ToolPayload = {
  status: ToolStatus;
  tool_calls: ToolExecution[];
};

export type ChatEvent = {
  _id: string;
  chat_id: string;
  author: AuthorType;
  type: ChatEventType;
  content: string;
  payload: ToolPayload | ReasoningPayload | null;
  created_at: string;
  updated_at: string;
};

// --- Pagination Types ---

export interface PaginationParams {
  limit?: number;
  before_timestamp?: string; // ISO 8601 format timestamp
  sort?: 'asc' | 'desc'; // Add sort property
}

export interface PaginatedResponseData<T> {
  items: T[];
  next_cursor_timestamp: string | null; // ISO 8601 format string
  has_more: boolean;
  total_items?: number | null;
}

// --- Core Data Models ---

export interface Chat {
  _id: string;
  name?: string;
  owner_id: string;
  created_at: string; // ISO 8601 format string
  updated_at: string; // ISO 8601 format string
  latest_message_content?: string;
  latest_message_timestamp?: string;
}

// --- Screenshot Type ---
export interface ScreenshotData {
    _id: string;
    chat_id: string;
    created_at: string; // ISO 8601 format string
    image_data: string; // The full data URI
    page_summary: string | null;
    evaluation_previous_goal: string | null;
    memory: string | null;
    next_goal: string | null;
}

// --- Request Payloads ---

export interface CreateMessagePayload {
  sender_type?: 'user' | 'agent';
  content: string;
}

export interface CreateChatPayload {
  name?: string;
}

// Add update payload type
export interface ChatUpdatePayload {
    name?: string;
}

// --- API Response Types (Specific Endpoints) ---

export type GetChatsResponse = ApiResponse<PaginatedResponseData<Chat>>;

export type GetChatEventsResponse = ApiResponse<PaginatedResponseData<ChatEvent>>;

// Response for getting *details* of a chat (without messages)
export type GetChatDetailsResponse = ApiResponse<Chat>;

// Response when creating a chat (returns the basic chat details)
export type CreateChatResponse = ApiResponse<Chat>;

// Response when adding a message (returns the created message)
export type AddMessageResponse = ApiResponse<ChatEvent>;

// === Paginated Response Wrapper ===
export type GetChatScreenshotsResponse = ApiResponse<PaginatedResponseData<ScreenshotData>>;