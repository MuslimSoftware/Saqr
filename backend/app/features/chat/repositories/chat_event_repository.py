from typing import List, Optional, Union
from datetime import datetime
from beanie import PydanticObjectId
from ..models.chat_event_model import ChatEvent, ChatEventType, ToolPayload, ReasoningPayload, AuthorType

class ChatEventRepository:
    """Repository for ChatEvent unified model (messages & tool invocations)."""

    async def create_event(
        self,
        chat_id: PydanticObjectId,
        author: AuthorType,
        type: ChatEventType,
        content: str,
        payload: Optional[Union[ToolPayload, ReasoningPayload]] = None
    ) -> ChatEvent:
        """Creates and saves a new ChatEvent."""
        event = ChatEvent(
            chat_id=chat_id,
            author=author,
            type=type,
            content=content,
            payload=payload
        )
        await event.create()
        return event

    async def get_events_for_chat(
        self,
        chat_id: PydanticObjectId,
        limit: int,
        before_timestamp: Optional[datetime] = None,
        type: Optional[ChatEventType] = None,
    ) -> List[ChatEvent]:
        """Fetches chat events by chat ID, paginated by timestamp descending."""
        query = ChatEvent.find(ChatEvent.chat_id == chat_id)
        if type:
            query = query.find(ChatEvent.type == type)
        if before_timestamp:
            query = query.find(ChatEvent.created_at < before_timestamp)
            
        # sort descending and limit
        events = await query.sort(-ChatEvent.created_at).limit(limit).to_list()
        return events

    async def get_event_by_id(self, event_id: PydanticObjectId) -> Optional[ChatEvent]:
        """Get a specific chat event by its ID."""
        return await ChatEvent.get(event_id) 

    async def delete_events_for_chat(self, chat_id: PydanticObjectId) -> None:
        """Delete all events for a specific chat."""
        await ChatEvent.find(ChatEvent.chat_id == chat_id).delete() 