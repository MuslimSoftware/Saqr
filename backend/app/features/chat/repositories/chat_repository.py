from typing import List, Optional, Literal
from beanie import PydanticObjectId, Link
from beanie.odm.operators.find.comparison import In
from datetime import datetime, timezone

# Adjusted imports for repository level
from ..models import Chat, ChatEvent
from ..schemas import MessageType

class ChatRepository:
    """Handles database operations for Chat and Message models."""
    HISTORY_LIMIT_DEFAULT: int = 40

    async def create_chat(self, name: Optional[str], owner_id: PydanticObjectId) -> Chat:
        """Creates and returns a new Chat document."""
        new_chat = Chat(name=name, owner_id=owner_id, messages=[])
        await new_chat.create()
        return new_chat

    async def find_chat_by_id(self, chat_id: PydanticObjectId) -> Optional[Chat]:
        """Finds a chat by its ID."""
        return await Chat.get(chat_id, fetch_links=False)

    async def find_chat_by_id_and_owner(
        self,
        chat_id: PydanticObjectId,
        owner_id: PydanticObjectId,
        fetch_links: bool = False # Allow specifying if links should be fetched
    ) -> Optional[Chat]:
        """Finds a chat by ID and owner ID, optionally fetching links."""
        return await Chat.find_one(
            Chat.id == chat_id,
            Chat.owner_id == owner_id,
            fetch_links=fetch_links
        )

    async def find_chats_by_owner(
        self, 
        owner_id: PydanticObjectId,
        limit: int,
        before_timestamp: Optional[datetime] = None
    ) -> List[Chat]:
        """Finds chats owned by a specific user, paginated."""
        query = Chat.find(Chat.owner_id == owner_id)
        
        if before_timestamp:
            query = query.find(Chat.created_at < before_timestamp)
            
        chats = await query.sort(-Chat.created_at).limit(limit).find(fetch_links=False).to_list()
        return chats

    async def save_chat(self, chat: Chat) -> Chat:
        """Saves changes to an existing Chat document."""
        await chat.save()
        return chat

    async def create_message(
        self,
        sender_type: str,
        content: str,
        author_id: Optional[PydanticObjectId],
        message_type: MessageType = 'text',
        tool_name: Optional[str] = None,
        is_final: bool = True
    ) -> ChatEvent:
        """Creates and returns a new Message document."""
        new_chat_event = ChatEvent(
            sender_type=sender_type,
            content=content,
            author_id=author_id,
            type=message_type,
            tool_name=tool_name,
            is_final=is_final
        )
        await new_chat_event.create()
        return new_chat_event

    async def add_message_link_to_chat(self, chat: Chat, message: ChatEvent) -> Chat:
        """Adds a message link to a chat and saves the chat.
        Conditionally updates latest_message fields based on message type.
        """
        if chat.messages is None:
            chat.messages = []
        chat.messages.append(Link(ref=message, document_class=ChatEvent))
        chat.updated_at = datetime.now(timezone.utc)

        if message.type in ['text', 'error']:
            chat.latest_message_content = message.content 
            chat.latest_message_timestamp = message.created_at
            
        await chat.save()
        return chat
        
    async def find_messages_by_ids(
        self,
        message_ids: List[PydanticObjectId],
        limit: int,
        before_timestamp: Optional[datetime] = None
    ) -> List[ChatEvent]:
        """Finds messages by their IDs, paginated by timestamp."""
        if not message_ids:
            return []

        query = ChatEvent.find(In(ChatEvent.id, message_ids))

        if before_timestamp:
            query = query.find(ChatEvent.created_at < before_timestamp)

        messages = await query.sort(-ChatEvent.created_at).limit(limit).to_list()
        return messages

    async def find_recent_messages_by_chat_id(
        self,
        chat_id: PydanticObjectId,
        history_limit: int = HISTORY_LIMIT_DEFAULT
    ) -> List[ChatEvent]:
        """Finds the most recent messages linked to a specific chat ID."""
        chat = await Chat.get(chat_id, fetch_links=False)
        if not chat or not chat.messages:
            return []

        # Extract message IDs from the chat's message links
        message_ids = [link.to_ref().id for link in chat.messages]
        if not message_ids:
            return []

        # Find the messages by these IDs, sort by creation date descending, and limit
        messages = await ChatEvent.find(In(ChatEvent.id, message_ids)) \
                                .sort(-ChatEvent.created_at) \
                                .limit(history_limit) \
                                .to_list()
                                
        # Reverse the list to get chronological order (oldest first) for LLM history
        return messages[::-1]

    async def update_message_content(self, message_id: PydanticObjectId, new_content: str) -> Optional[ChatEvent]:
        """Updates the content of a specific message by its ID."""
        message = await ChatEvent.get(message_id)
        if message:
            message.content = new_content
            # We could update an `updated_at` field here if Message model had one
            await message.save()
            return message
        return None 

    async def delete_chat(self, chat_id: PydanticObjectId) -> None:
        """Delete a chat by its ID."""
        await Chat.find(Chat.id == chat_id).delete() 