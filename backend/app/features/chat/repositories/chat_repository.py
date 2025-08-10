from typing import Optional
from beanie import PydanticObjectId
from datetime import datetime, timezone

# Adjusted imports for repository level
from ..models import Chat

class ChatRepository:
    """Handles database operations for Chat models - now deprecated, use Redis instead."""
    
    async def create_chat(self, name: Optional[str], owner_id: PydanticObjectId) -> Chat:
        """DEPRECATED: Creates and returns a new Chat document - use Redis instead."""
        raise NotImplementedError("Chat operations moved to Redis. Use RedisChatService instead.")

    async def find_chat_by_id(self, chat_id: PydanticObjectId) -> Optional[Chat]:
        """DEPRECATED: Finds a chat by its ID - use Redis instead."""
        raise NotImplementedError("Chat operations moved to Redis. Use RedisChatService instead.")

    async def find_chat_by_id_and_owner(
        self,
        chat_id: PydanticObjectId,
        owner_id: PydanticObjectId,
        fetch_links: bool = False
    ) -> Optional[Chat]:
        """DEPRECATED: Finds a chat by ID and owner ID - use Redis instead."""
        raise NotImplementedError("Chat operations moved to Redis. Use RedisChatService instead.")

    async def find_chats_by_owner(
        self, 
        owner_id: PydanticObjectId,
        limit: int,
        before_timestamp: Optional[datetime] = None
    ):
        """DEPRECATED: Finds chats owned by a specific user - use Redis instead."""
        raise NotImplementedError("Chat operations moved to Redis. Use RedisChatService instead.")

    async def save_chat(self, chat: Chat) -> Chat:
        """DEPRECATED: Saves changes to an existing Chat document - use Redis instead."""
        raise NotImplementedError("Chat operations moved to Redis. Use RedisChatService instead.")

    async def delete_chat(self, chat_id: PydanticObjectId) -> None:
        """DEPRECATED: Delete a chat by its ID - use Redis instead."""
        raise NotImplementedError("Chat operations moved to Redis. Use RedisChatService instead.") 