from typing import List, Optional, TYPE_CHECKING, Literal, Dict, Any, Union
from datetime import datetime, timezone
import json
import dspy
import os

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
        """Helper to broadcast a user text message - simplified without MongoDB storage."""
        print("User message broadcasting disabled - MongoDB dependencies removed")

    async def send_agent_message(self, chat: Chat, content: str) -> None:
        """Helper to broadcast an agent text message - simplified without MongoDB storage."""
        print("Agent message broadcasting disabled - MongoDB dependencies removed")

    async def send_error_message(self, chat: Chat, content: str) -> None:
        """Helper to broadcast an agent error message - simplified without MongoDB storage."""
        print("Error message broadcasting disabled - MongoDB dependencies removed")

    async def send_reasoning_message(self, chat: Chat, content: str, trajectory: List[str], status: str = "thinking") -> None:
        """Helper to broadcast an agent reasoning message - simplified without MongoDB storage."""
        print("Reasoning message broadcasting disabled - MongoDB dependencies removed")

    async def send_tool_message(self, chat: Chat, tool_name: str, input_payload: Dict[str, Any]) -> None:
        """Helper to broadcast a tool message - simplified without MongoDB storage."""
        print("Tool message broadcasting disabled - MongoDB dependencies removed")

    async def send_tool_update(self, chat: Chat, tool_name: str, status: str, output_payload: Optional[Dict[str, Any]] = None) -> None:
        """Helper to broadcast tool updates - simplified without MongoDB storage."""
        print("Tool update broadcasting disabled - MongoDB dependencies removed")