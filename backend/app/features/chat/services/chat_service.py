from typing import List, Optional, TYPE_CHECKING, Literal, Dict, Any, Union
from datetime import datetime, timezone
import json
import dspy
import os
import uuid

from ..models import Chat
from ..schemas import ChatCreate, ChatUpdate
from app.features.common.schemas.common_schemas import PaginatedResponseData
from app.features.common.exceptions import AppException
from app.config.environment import environment
if TYPE_CHECKING:
    from app.config.dependencies import ChatRepositoryDep, WebSocketRepositoryDep
    from app.features.chat.repositories import ChatRepository, WebSocketRepository

class ChatTitleGenerator(dspy.Signature):
    """Generate a short, descriptive title for a chat conversation."""
    conversation = dspy.InputField(desc="The conversation text between user and assistant")
    title = dspy.OutputField(desc="A short, descriptive title (3-5 words) that captures the main topic")

def get_tool_display_name(tool_name: str) -> str:
    """Maps internal tool names to user-friendly display names."""
    tool_name_mapping = {
        'scrape_website': 'Super Web Search',
        'search_web': 'Web Search', 
        'query_sql_db': 'SQL Query',
        'query_mongo_db': 'Debug Log Query',
        'finish': 'Complete'
    }
    return tool_name_mapping.get(tool_name, tool_name)

class ChatService:
    """Service layer for chat operations - uses Redis and WebSocket for real-time messaging."""
    def __init__(
        self,
        chat_repository: 'ChatRepositoryDep',
        websocket_repository: 'WebSocketRepositoryDep'
    ):
        self.chat_repository = chat_repository
        self.websocket_repository = websocket_repository
        self.current_session_token = None  # Will be set by the agent service context

    def set_session_context(self, session_token: str):
        """Set the session token for Redis operations."""
        self.current_session_token = session_token

    async def create_new_chat(self, chat_data: ChatCreate, owner_id: str) -> Chat:
        """DEPRECATED: Service layer function to create a new chat - use RedisChatService instead."""
        raise NotImplementedError("Chat operations moved to Redis. Use RedisChatService instead.")

    async def get_chats_for_user(
        self, 
        owner_id: str,
        limit: int,
        before_timestamp: Optional[datetime]
    ) -> PaginatedResponseData[Chat]:
        """DEPRECATED: Service layer function to get chats for a user - use RedisChatService instead."""
        raise NotImplementedError("Chat operations moved to Redis. Use RedisChatService instead.")

    async def get_chat_by_id(self, chat_id: str, owner_id: str) -> Chat:
        """DEPRECATED: Gets chat details - use RedisChatService instead."""
        raise NotImplementedError("Chat operations moved to Redis. Use RedisChatService instead.")
        
    async def get_chat_events_for_chat(
        self,
        chat_id: str,
        owner_id: str,
        limit: int,
        before_timestamp: Optional[datetime]
    ) -> PaginatedResponseData[Dict[str, Any]]:
        """Service to get chat events - disabled as MongoDB dependencies removed."""
        print("Chat events retrieval disabled - MongoDB dependencies removed")
        return PaginatedResponseData(
            items=[],
            has_more=False,
            next_cursor_timestamp=None
        )

    async def update_chat_details(
        self,
        chat_id: str,
        update_data: ChatUpdate,
        owner_id: str
    ) -> Chat:
        """DEPRECATED: Updates a chat's name - use RedisChatService instead."""
        raise NotImplementedError("Chat operations moved to Redis. Use RedisChatService instead.")

    async def get_screenshots_for_chat(
        self,
        chat_id: str,
        owner_id: str,
        limit: int,
        before_timestamp: Optional[datetime] = None
    ) -> PaginatedResponseData[Dict[str, Any]]:
        """Service layer function to get screenshots - disabled as MongoDB dependencies removed."""
        print("Screenshots retrieval disabled - MongoDB dependencies removed")
        return PaginatedResponseData(
            items=[],
            has_more=False,
            next_cursor_timestamp=None,
            total_items=0
        )
    
    async def delete_chat(
        self,
        chat_id: str,
        owner_id: str
    ) -> None:
        """DEPRECATED: Deletes a chat and all its related data - use RedisChatService instead."""
        raise NotImplementedError("Chat operations moved to Redis. Use RedisChatService instead.")
    
    async def _generate_chat_title(self, chat: Chat) -> Optional[str]:
        """Generate a title for the chat based on recent messages - disabled as MongoDB dependencies removed."""
        print("Chat title generation disabled - MongoDB dependencies removed")
        return None

    async def send_user_message(self, chat: Chat, content: str) -> None:
        """Helper to broadcast a user text message using Redis and WebSocket."""
        await self._broadcast_message(chat, content, "user", "message")

    async def send_agent_message(self, chat: Chat, content: str) -> None:
        """Helper to broadcast an agent text message using Redis and WebSocket."""
        await self._broadcast_message(chat, content, "agent", "message")

    async def send_error_message(self, chat: Chat, content: str) -> None:
        """Helper to broadcast an agent error message using Redis and WebSocket."""
        await self._broadcast_message(chat, content, "agent", "error")

    async def send_reasoning_message(self, chat: Chat, content: str, trajectory: List[str], status: str = "thinking", message_id: str = None) -> None:
        """Helper to broadcast an agent reasoning message using Redis and WebSocket."""
        # Frontend expects specific status values: 'thinking' | 'complete'
        frontend_status = "complete" if status == "complete" else "thinking"
        
        reasoning_payload = {
            "trajectory": trajectory,  # Frontend expects trajectory first
            "status": frontend_status
        }
        await self._broadcast_message(chat, content, "agent", "reasoning", reasoning_payload, message_id)

    async def send_tool_message(self, chat: Chat, tool_name: str, input_payload: Dict[str, Any], message_id: str = None) -> None:
        """Helper to broadcast a tool message using Redis and WebSocket."""
        # Create frontend-compatible tool payload
        from datetime import datetime, timezone
        current_time = datetime.now(timezone.utc).isoformat()
        
        tool_execution = {
            "tool_name": get_tool_display_name(tool_name),
            "input_payload": input_payload,
            "output_payload": None,
            "error": None,
            "status": "started",
            "started_at": current_time,
            "completed_at": None
        }
        
        tool_payload = {
            "status": "started",
            "tool_calls": [tool_execution]
        }
        
        await self._broadcast_message(chat, get_tool_display_name(tool_name), "agent", "tool", tool_payload, message_id)

    async def send_tool_update(self, chat: Chat, tool_name: str, status: str, output_payload: Optional[Dict[str, Any]] = None, input_payload: Dict[str, Any] = None, message_id: str = None) -> None:
        """Helper to broadcast tool updates using Redis and WebSocket."""
        # Create frontend-compatible tool payload  
        from datetime import datetime, timezone
        current_time = datetime.now(timezone.utc).isoformat()
        
        # Map backend status to frontend status
        frontend_status = "completed" if status == "completed" else "error" if status == "error" else "in_progress"
        
        tool_execution = {
            "tool_name": get_tool_display_name(tool_name),
            "input_payload": input_payload or {},  # Include original input payload
            "output_payload": output_payload,
            "error": None if status == "completed" else "Tool execution failed",
            "status": frontend_status,
            "started_at": current_time,  # We don't track this separately, use current time
            "completed_at": current_time if status in ["completed", "error"] else None
        }
        
        tool_payload = {
            "status": frontend_status,
            "tool_calls": [tool_execution]
        }
        
        content = get_tool_display_name(tool_name)
        await self._broadcast_message(chat, content, "agent", "tool", tool_payload, message_id)

    async def _broadcast_message(self, chat: Chat, content: str, author: str, msg_type: str, payload: Optional[Dict[str, Any]] = None, message_id: str = None) -> None:
        """Internal helper to broadcast messages via WebSocket and store in Redis."""
        try:
            from datetime import datetime, timezone
            import uuid
            
            # Use provided message_id for reasoning updates, generate new for others
            msg_id = message_id if message_id else str(uuid.uuid4())
            
            # Create message data for WebSocket broadcast
            message_data = {
                "type": msg_type,
                "_id": msg_id,
                "chat_id": str(chat.id),
                "author": author,
                "content": content,
                "payload": payload,
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Broadcast via WebSocket to connected clients
            message_json = json.dumps(message_data)
            await self.websocket_repository.broadcast_to_chat(message_json, str(chat.id))
            
            print(f"[DEBUG] Broadcasted {msg_type} message from {author}: {content[:50]}...")
            
            # For agent messages, also store in Redis for chat history
            if author == "agent" and msg_type in ["message", "error"]:
                try:
                    if self.current_session_token:
                        # Store in Redis using the Redis chat service
                        from app.config.dependencies.services import get_redis_chat_service
                        redis_service = get_redis_chat_service()
                        
                        # Convert ObjectId back to UUID for Redis operations
                        chat_id_str = str(chat.id)
                        redis_uuid = await redis_service._objectid_to_uuid(chat_id_str, self.current_session_token)
                        
                        # Store the agent message in Redis
                        await redis_service.add_message(
                            redis_uuid, 
                            self.current_session_token, 
                            content, 
                            "agent", 
                            payload  # Store payload as metadata
                        )
                        print(f"[DEBUG] ✅ Agent message stored in Redis for chat history")
                        
                    else:
                        print(f"[DEBUG] ⚠️  Agent message not stored in Redis (no session token)")
                    
                except Exception as e:
                    print(f"[DEBUG] ❌ Error storing agent message in Redis: {e}")
                    # Don't fail the broadcast if storage fails
                    
        except Exception as e:
            print(f"Error broadcasting message: {e}")
            # Don't raise the exception to avoid breaking the agent flow