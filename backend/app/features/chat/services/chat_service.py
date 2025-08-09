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
    """DEPRECATED: Service layer for chat operations - now uses Redis instead of MongoDB."""
    def __init__(
        self,
        chat_repository: 'ChatRepositoryDep',
        websocket_repository: 'WebSocketRepositoryDep'
    ):
        self.chat_repository = chat_repository
        self.websocket_repository = websocket_repository

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

    async def send_reasoning_message(self, chat: Chat, content: str, trajectory: List[str], status: str = "thinking") -> None:
        """Helper to broadcast an agent reasoning message using Redis and WebSocket."""
        reasoning_payload = {
            "content": content,
            "trajectory": trajectory,
            "status": status
        }
        await self._broadcast_message(chat, content, "agent", "reasoning", reasoning_payload)

    async def send_tool_message(self, chat: Chat, tool_name: str, input_payload: Dict[str, Any]) -> None:
        """Helper to broadcast a tool message using Redis and WebSocket."""
        tool_payload = {
            "tool_name": get_tool_display_name(tool_name),
            "input_payload": input_payload,
            "status": "pending"
        }
        await self._broadcast_message(chat, f"Using tool: {get_tool_display_name(tool_name)}", "agent", "tool_use", tool_payload)

    async def send_tool_update(self, chat: Chat, tool_name: str, status: str, output_payload: Optional[Dict[str, Any]] = None) -> None:
        """Helper to broadcast tool updates using Redis and WebSocket."""
        tool_payload = {
            "tool_name": get_tool_display_name(tool_name),
            "status": status,
            "output_payload": output_payload
        }
        content = f"Tool {get_tool_display_name(tool_name)} {status}"
        await self._broadcast_message(chat, content, "agent", "tool_result", tool_payload)

    async def _broadcast_message(self, chat: Chat, content: str, author: str, msg_type: str, payload: Optional[Dict[str, Any]] = None) -> None:
        """Internal helper to broadcast messages via WebSocket and store in Redis."""
        try:
            from datetime import datetime, timezone
            import uuid
            
            # Create message data for WebSocket broadcast
            message_data = {
                "type": msg_type,
                "_id": str(uuid.uuid4()),
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
                    # Try to store in Redis using the Redis chat service
                    from app.config.dependencies.services import get_redis_chat_service
                    redis_service = get_redis_chat_service()
                    
                    # We need the session token to store in Redis, but we don't have it here
                    # This is a limitation of the current architecture
                    # For now, we'll just broadcast via WebSocket
                    print(f"[DEBUG] Note: Agent message not stored in Redis (no session context)")
                    
                except Exception as e:
                    print(f"[DEBUG] Error storing agent message in Redis: {e}")
                    
        except Exception as e:
            print(f"Error broadcasting message: {e}")
            # Don't raise the exception to avoid breaking the agent flow