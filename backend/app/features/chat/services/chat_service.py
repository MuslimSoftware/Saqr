from typing import List, Optional, TYPE_CHECKING, Literal, Dict, Any, Union
from beanie import PydanticObjectId, Link
from datetime import datetime, timezone
import json
import dspy
import os

from ..models import Chat, Screenshot, ChatEvent
from ..schemas import ChatCreate, ChatUpdate, ScreenshotData
from ..models.chat_event_model import ChatEventType, AuthorType
from app.features.common.schemas.common_schemas import PaginatedResponseData
from app.features.common.exceptions import AppException
from app.features.chat.repositories import ChatEventRepository
from app.features.chat.models.chat_event_model import ToolPayload, ReasoningPayload, ToolStatus, ToolExecution
from app.config.environment import environment
if TYPE_CHECKING:
    from app.config.dependencies import ChatRepositoryDep, WebSocketRepositoryDep, ScreenshotRepositoryDep
    from app.features.chat.repositories import ChatRepository, WebSocketRepository, ScreenshotRepository
    from app.features.chat.repositories import ChatEventRepository

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
    """Service layer for chat operations, uses ChatRepository."""
    def __init__(
        self,
        chat_repository: 'ChatRepositoryDep',
        screenshot_repository: 'ScreenshotRepositoryDep',
        websocket_repository: 'WebSocketRepositoryDep',
        chat_event_repository: 'ChatEventRepository'
    ):
        self.chat_repository = chat_repository
        self.screenshot_repository = screenshot_repository
        self.websocket_repository = websocket_repository
        self.chat_event_repository = chat_event_repository

    async def create_new_chat(self, chat_data: ChatCreate, owner_id: PydanticObjectId) -> Chat:
        """Service layer function to create a new chat."""
        new_chat = await self.chat_repository.create_chat(
            name=chat_data.name, 
            owner_id=owner_id
        )
        return new_chat

    async def get_chats_for_user(
        self, 
        owner_id: PydanticObjectId,
        limit: int,
        before_timestamp: Optional[datetime]
    ) -> PaginatedResponseData[Chat]:
        """Service layer function to get chats for a user, paginated."""
        fetch_limit = limit + 1
        chats = await self.chat_repository.find_chats_by_owner(
            owner_id=owner_id,
            limit=fetch_limit,
            before_timestamp=before_timestamp
        )

        has_more = len(chats) == fetch_limit
        items_to_return = chats[:limit] if has_more else chats
        
        next_cursor_timestamp = items_to_return[-1].created_at if items_to_return and has_more else None

        chat_items = [Chat.model_validate(chat) for chat in items_to_return]

        return PaginatedResponseData(
            items=chat_items,
            has_more=has_more,
            next_cursor_timestamp=next_cursor_timestamp
        )

    async def get_chat_by_id(self, chat_id: PydanticObjectId, owner_id: PydanticObjectId) -> Chat:
        """DEPRECATED: Use get_messages_for_chat for messages. Gets chat details without messages."""
        chat = await self.chat_repository.find_chat_by_id_and_owner(
            chat_id=chat_id,
            owner_id=owner_id,
            fetch_links=False
        )
        if not chat:
             raise AppException(status_code=404, error_code="CHAT_NOT_FOUND", message="Chat not found or not owned by user")
        
        return chat
        
    async def get_chat_events_for_chat(
        self,
        chat_id: PydanticObjectId,
        owner_id: PydanticObjectId,
        limit: int,
        before_timestamp: Optional[datetime]
    ) -> PaginatedResponseData[ChatEvent]:
        """Service to get merged chat message and tool-invocation events, paginated."""
        # 1. Verify chat ownership
        chat = await self.chat_repository.find_chat_by_id_and_owner(
            chat_id=chat_id,
            owner_id=owner_id,
            fetch_links=False
        )
        if not chat:
            raise AppException(status_code=404, error_code="CHAT_NOT_FOUND", message="Chat not found or not owned by user")

        # 2. Fetch unified events
        fetch_limit = limit + 1
        events = await self.chat_event_repository.get_events_for_chat(
            chat_id=chat_id,
            limit=fetch_limit,
            before_timestamp=before_timestamp
        )
        # 3. Convert to schema objects
        events = [ev.model_dump(by_alias=True, exclude_none=True) for ev in events]

        # 4. Paginate
        has_more = len(events) > limit
        sliced = events[:limit]
        next_cursor = sliced[-1]["created_at"] if sliced and has_more else None
        return PaginatedResponseData(
            items=sliced,
            has_more=has_more,
            next_cursor_timestamp=next_cursor
        )

    async def update_chat_details(
        self,
        chat_id: PydanticObjectId,
        update_data: ChatUpdate,
        owner_id: PydanticObjectId
    ) -> Chat:
        """Updates a chat's name."""
        chat = await self.chat_repository.find_chat_by_id_and_owner(chat_id, owner_id)
        if not chat:
             raise AppException(status_code=404, error_code="CHAT_NOT_FOUND", message="Chat not found or not owned by user")

        # Check if at least one field is provided for update
        update_payload = update_data.model_dump(exclude_unset=True)
        if not update_payload:
             raise AppException(status_code=400, error_code="NO_UPDATE_DATA", message="No fields provided for update")

        # Update fields if they are provided in the payload
        if "name" in update_payload:
            chat.name = update_payload["name"]
        
        # Use timezone-aware UTC timestamp
        chat.updated_at = datetime.now(timezone.utc) 
        updated_chat = await self.chat_repository.save_chat(chat)
        updated_chat.messages = [] 
        return updated_chat

    async def get_screenshots_for_chat(
        self,
        chat_id: PydanticObjectId,
        owner_id: PydanticObjectId,
        limit: int,
        before_timestamp: Optional[datetime] = None
    ) -> PaginatedResponseData[ScreenshotData]:
        """Service layer function to get paginated screenshots for a specific chat."""
        # 1. Verify chat ownership
        chat = await self.chat_repository.find_chat_by_id_and_owner(
            chat_id=chat_id,
            owner_id=owner_id,
            fetch_links=False
        )
        if not chat:
            raise AppException(status_code=404, error_code="CHAT_NOT_FOUND", message="Chat not found or not owned by user")

        # 2. Fetch total count and screenshots from repository with pagination logic
        total_count = await self.screenshot_repository.count_screenshots_by_chat_id(chat_id)
        
        fetch_limit = limit + 1
        screenshots = await self.screenshot_repository.find_screenshots_by_chat_id(
            chat_id=chat_id,
            limit=fetch_limit,
            before_timestamp=before_timestamp
        )

        # 3. Calculate pagination details
        has_more = len(screenshots) == fetch_limit
        items_to_return = screenshots[:limit] if has_more else screenshots

        # Determine the next cursor timestamp based on the last item returned
        next_cursor_timestamp = items_to_return[-1].created_at if items_to_return and has_more else None

        # 4. Convert to response schema
        screenshot_items = [ScreenshotData.model_validate(ss) for ss in items_to_return]

        # 5. Return paginated response including total count
        return PaginatedResponseData(
            items=screenshot_items,
            has_more=has_more,
            next_cursor_timestamp=next_cursor_timestamp,
            total_items=total_count
        )
    
    async def delete_chat(
        self,
        chat_id: PydanticObjectId,
        owner_id: PydanticObjectId
    ) -> None:
        """Deletes a chat and all its related data (messages, screenshots, etc.)."""
        # 1. Verify chat ownership
        chat = await self.chat_repository.find_chat_by_id_and_owner(
            chat_id=chat_id,
            owner_id=owner_id,
            fetch_links=False
        )
        if not chat:
            raise AppException(status_code=404, error_code="CHAT_NOT_FOUND", message="Chat not found or not owned by user")

        # 2. Delete related data first
        # Delete all chat events (messages, tool calls, etc.)
        await self.chat_event_repository.delete_events_for_chat(chat_id)
        
        # Delete all screenshots
        await self.screenshot_repository.delete_screenshots_for_chat(chat_id)
        
        # 3. Finally, delete the chat itself
        await self.chat_repository.delete_chat(chat_id)
    
    async def _generate_chat_title(self, chat: Chat) -> Optional[str]:
        """Generate a title for the chat based on recent messages."""
        try:
            # Get recent messages for context
            events = await self.chat_event_repository.get_events_for_chat(
                chat_id=chat.id,
                limit=4,  # Get first few messages for context
                type=ChatEventType.MESSAGE
            )
            
            if len(events) < 2:  # Need at least user + agent message
                return None
                
            # Reverse to get chronological order
            events.reverse()
            
            # Build conversation context
            conversation = []
            for event in events:
                role = "User" if event.author == AuthorType.USER else "Assistant"
                conversation.append(f"{role}: {event.content}")
            
            conversation_text = "\n".join(conversation)
            
            # Configure DSPy with Gemini
            dspy.configure(
                lm=dspy.LM(model="gemini/gemini-2.0-flash-exp", api_key=environment.GEMINI_API_KEY)
            )
            
            # Generate title using DSPy
            title_generator = dspy.Predict(ChatTitleGenerator)
            result = title_generator(conversation=conversation_text)
            
            title = result.title.strip()
            
            # Clean up the title
            title = title.replace('"', '').replace("'", '').strip()
            
            # Limit length
            if len(title) > 50:
                title = title[:47] + "..."
                
            return title
            
        except Exception as e:
            print(f"Error generating chat title: {e}")
            return None

    async def _create_and_broadcast_message(
        self,
        chat: Chat,
        author: AuthorType,
        content: str,
        type: ChatEventType,
        payload: Optional[Union[ToolPayload, ReasoningPayload]] = None,
    ) -> ChatEvent:
        """Internal helper: Creates a ChatEvent and broadcasts via WebSocket."""
        # Create and persist the event
        event = await self.chat_event_repository.create_event(
            chat_id=chat.id,
            author=author,
            type=type,
            content=content,
            payload=payload
        )

        # Update chat's latest message fields for relevant message types
        if type in [ChatEventType.MESSAGE, ChatEventType.ERROR]:
            chat.latest_message_content = content
            chat.latest_message_timestamp = event.created_at
            chat.updated_at = datetime.now(timezone.utc)
            
            # Auto-generate title if this is the first agent response and chat has default name
            if (author == AuthorType.AGENT and 
                type == ChatEventType.MESSAGE and 
                (chat.name is None or chat.name == "New Chat")):
                
                generated_title = await self._generate_chat_title(chat)
                if generated_title:
                    print(f"Generated title: {generated_title}")
                    chat.name = generated_title
                    
                    # Emit title update event to frontend
                    await self._broadcast_title_update(chat)
            
            await self.chat_repository.save_chat(chat)

        # Broadcast the serialized event
        raw_event = event.model_dump(by_alias=True, exclude_none=True)
        message_json = json.dumps(raw_event, default=str)

        await self.websocket_repository.broadcast_to_chat(
            message=message_json,
            chat_id=str(chat.id)
        )

        return event

    async def _broadcast_title_update(self, chat: Chat) -> None:
        """Broadcast a title update event to the frontend."""
        try:
            title_update_event = {
                "type": "chat_title_updated",
                "data": {
                    "chat_id": str(chat.id),
                    "title": chat.name,
                    "updated_at": chat.updated_at.isoformat()
                }
            }
            
            message_json = json.dumps(title_update_event, default=str)
            
            await self.websocket_repository.broadcast_to_chat(
                message=message_json,
                chat_id=str(chat.id)
            )
            
            print(f"Broadcasted title update for chat {chat.id}: {chat.name}")
            
        except Exception as e:
            print(f"Error broadcasting title update: {e}")

    async def broadcast_screenshot_event(
        self, 
        chat: Chat, 
        screenshot: Screenshot, 
        step_index: int
    ) -> None:
        """Broadcast a screenshot event to the frontend with full screenshot data."""
        try:
            # Create screenshot data in the format expected by frontend (ScreenshotData)
            screenshot_data = {
                "_id": str(screenshot.id),
                "chat_id": str(screenshot.chat_id),
                "created_at": screenshot.created_at.isoformat(),
                "image_data": screenshot.image_data,
                "page_summary": screenshot.page_summary,
                "evaluation_previous_goal": screenshot.evaluation_previous_goal,
                "memory": screenshot.memory,
                "next_goal": screenshot.next_goal
            }
            
            screenshot_event = {
                "type": "screenshot_captured",
                "data": {
                    "screenshot": screenshot_data,
                    "step_index": step_index
                }
            }
            
            message_json = json.dumps(screenshot_event, default=str)
            
            await self.websocket_repository.broadcast_to_chat(
                message=message_json,
                chat_id=str(chat.id)
            )
            
            print(f"Broadcasted screenshot event for chat {chat.id}: step {step_index}")
            
        except Exception as e:
            print(f"Error broadcasting screenshot event: {e}")

    async def send_user_message(
        self,
        chat: Chat,
        content: str,
    ) -> Optional[ChatEvent]:
        """Helper to create and broadcast a user text message."""
        return await self._create_and_broadcast_message(
            chat=chat,
            author=AuthorType.USER,
            type=ChatEventType.MESSAGE,
            content=content
        )

    async def send_agent_message(
        self,
        chat: Chat,
        content: str
    ) -> Optional[ChatEvent]:
        """Helper to create and broadcast an agent text message."""
        return await self._create_and_broadcast_message(
            chat=chat,
            author=AuthorType.AGENT,
            type=ChatEventType.MESSAGE,
            content=content
        )

    async def send_error_message(
        self,
        chat: Chat,
        content: str
    ) -> Optional[ChatEvent]:
        """Helper to create and broadcast an agent error message."""
        return await self._create_and_broadcast_message(
            chat=chat,
            author=AuthorType.AGENT,
            type=ChatEventType.ERROR,
            content=content
        )

    async def send_reasoning_message(
        self,
        chat: Chat,
        content: str,
        trajectory: List[str],
        status: str = "thinking"
    ) -> Optional[ChatEvent]:
        """Helper to create and broadcast an agent reasoning message with trajectory."""
        payload = ReasoningPayload(trajectory=trajectory, status=status)
        return await self._create_and_broadcast_message(
            chat=chat,
            author=AuthorType.AGENT,
            type=ChatEventType.REASONING,
            content=content,
            payload=payload
        )

    async def update_reasoning_message(
        self,
        chat: Chat,
        message_id: PydanticObjectId,
        new_content: Optional[str],
        status: Optional[str] = None
    ) -> Optional[ChatEvent]:
        """Update an existing reasoning message by appending old content to trajectory."""
        # Find the existing reasoning message
        event = await self.chat_event_repository.get_event_by_id(message_id)
        if not event or event.type != ChatEventType.REASONING:
            return None
            
        # Get current payload or create new one
        payload = event.payload if event.payload else ReasoningPayload(trajectory=[], status="thinking")
        if not isinstance(payload, ReasoningPayload):
            payload = ReasoningPayload(trajectory=[], status="thinking")
            
        # Always append old content to trajectory (chronological order) if we have new content
        if new_content and event.content:
            payload.trajectory.append(event.content)
        
        # Update status if provided
        if status is not None:
            payload.status = status
        
        # Update the event content only if new_content is provided
        if new_content is not None:
            event.content = new_content
        
        event.payload = payload
        event.updated_at = datetime.now(timezone.utc)
        
        # Save the updated event
        await event.save()
        
        # Broadcast the updated event
        raw_event = event.model_dump(by_alias=True, exclude_none=True)
        message_json = json.dumps(raw_event, default=str)
        
        await self.websocket_repository.broadcast_to_chat(
            message=message_json,
            chat_id=str(chat.id)
        )
        
        return event

    async def send_tool_message(
        self,
        chat: Chat,
        tool_name: str,
        input_payload: Dict[str, Any]
    ) -> ChatEvent:
        """Creates a tool ChatEvent with a new ToolExecution and broadcasts it."""
        from ..models.chat_event_model import ToolExecution
        
        # Create a new tool execution
        tool_execution = ToolExecution(
            tool_name=tool_name,
            input_payload=input_payload,
            status=ToolStatus.STARTED
        )
        
        payload = ToolPayload(
            status=ToolStatus.STARTED,
            tool_calls=[tool_execution]
        )

        content = f"{get_tool_display_name(tool_name)}"

        event = await self.chat_event_repository.create_event(
            chat_id=chat.id,
            author=AuthorType.AGENT,
            type=ChatEventType.TOOL,
            content=content,
            payload=payload
        )

        # Broadcast the serialized event
        raw_event = event.model_dump(by_alias=True, exclude_none=True)
        message_json = json.dumps(raw_event, default=str)

        await self.websocket_repository.broadcast_to_chat(
            message=message_json,
            chat_id=str(chat.id)
        )

        return event

    async def send_tool_update(
        self,
        chat: Chat,
        tool_name: str,
        status: ToolStatus,
        output_payload: Optional[Dict[str, Any]] = None
    ) -> ChatEvent:
        """Updates the latest matching tool execution and broadcasts the updated event."""
        from datetime import datetime, timezone
        
        # Fetch recent tool events for this chat
        events = await self.chat_event_repository.get_events_for_chat(
            chat_id=chat.id,
            limit=5,
            type=ChatEventType.TOOL
        )
        
        # Find the latest event with a matching tool execution
        for event in events:
            if event.type == ChatEventType.TOOL and event.payload and event.payload.tool_calls:
                # Find the latest tool call with matching name and STARTED status
                for tool_call in reversed(event.payload.tool_calls):  # Check most recent first
                    if tool_call.tool_name == tool_name and tool_call.status == ToolStatus.STARTED:
                        # Update the tool execution
                        tool_call.status = status
                        if output_payload is not None:
                            tool_call.output_payload = output_payload
                        if status in [ToolStatus.COMPLETED, ToolStatus.ERROR]:
                            tool_call.completed_at = datetime.now(timezone.utc)
                        
                        # Update the overall payload status
                        event.payload.status = status
                        event.updated_at = datetime.now(timezone.utc)
                        
                        await event.save()
                        
                        # Broadcast the updated event
                        raw_event = event.model_dump(by_alias=True, exclude_none=True)
                        message_json = json.dumps(raw_event, default=str)
                        
                        await self.websocket_repository.broadcast_to_chat(
                            message=message_json,
                            chat_id=str(chat.id)
                        )

                        return event
        
        return None

    async def add_tool_call_to_event(
        self,
        chat: Chat,
        tool_name: str,
        input_payload: Dict[str, Any]
    ) -> Optional[ChatEvent]:
        """Adds a new tool call to the most recent tool event for the same tool, or creates a new event if none exists."""
        from ..models.chat_event_model import ToolExecution
        
        # Fetch recent tool events for this chat
        events = await self.chat_event_repository.get_events_for_chat(
            chat_id=chat.id,
            limit=5,  # Check more events to find the right tool
            type=ChatEventType.TOOL
        )
        
        # Find the most recent event for the same tool
        target_event = None
        for event in events:
            if event.payload and event.payload.tool_calls:
                # Check if any tool call in this event matches our tool name
                for tool_call in event.payload.tool_calls:
                    if tool_call.tool_name == tool_name:
                        target_event = event
                        break
                if target_event:
                    break
        
        if target_event:
            # Add to existing trajectory for the same tool
            tool_execution = ToolExecution(
                tool_name=tool_name,
                input_payload=input_payload,
                status=ToolStatus.STARTED
            )
            
            target_event.payload.tool_calls.append(tool_execution)
            target_event.payload.status = ToolStatus.IN_PROGRESS
            target_event.updated_at = datetime.now(timezone.utc)
            
            content = f"{get_tool_display_name(tool_name)}"
            
            target_event.content = content
            
            await target_event.save()
            
            # Broadcast the updated event
            raw_event = target_event.model_dump(by_alias=True, exclude_none=True)
            message_json = json.dumps(raw_event, default=str)
            
            await self.websocket_repository.broadcast_to_chat(
                message=message_json,
                chat_id=str(chat.id)
            )
            
            return target_event
        else:
            # Create new event for this tool
            print(f"   📋 Creating new trajectory for {tool_name}")

    async def update_tool_event_by_id(
        self,
        event_id: PydanticObjectId,
        tool_name: str,
        status: ToolStatus,
        output_payload: Optional[Dict[str, Any]] = None
    ) -> Optional[ChatEvent]:
        """Update a specific tool event by ID and tool name."""
        from datetime import datetime, timezone
        
        # Get the event by ID
        event = await self.chat_event_repository.get_event_by_id(event_id)
        if not event or event.type != ChatEventType.TOOL or not event.payload:
            print(f"   ❌ Event not found or invalid: event={event is not None}, type={event.type if event else 'None'}, payload={event.payload is not None if event else 'None'}")
            return None
        
        # Find the matching tool call
        for i, tool_call in enumerate(reversed(event.payload.tool_calls)):  # Check most recent first
            if tool_call.tool_name == tool_name and tool_call.status == ToolStatus.STARTED:
                # Update the tool execution
                tool_call.status = status
                if output_payload is not None:
                    tool_call.output_payload = output_payload
                if status in [ToolStatus.COMPLETED, ToolStatus.ERROR]:
                    tool_call.completed_at = datetime.now(timezone.utc)
                
                # Update the overall payload status
                event.payload.status = status
                event.updated_at = datetime.now(timezone.utc)
                
                await event.save()
                
                # Broadcast the updated event
                raw_event = event.model_dump(by_alias=True, exclude_none=True)
                message_json = json.dumps(raw_event, default=str)
                
                await self.websocket_repository.broadcast_to_chat(
                    message=message_json,
                    chat_id=str(event.chat_id)
                )
                
                return event
        
        return None