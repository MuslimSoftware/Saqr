from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, Literal, Dict, Any, Union
from beanie import PydanticObjectId

from app.features.chat.models.chat_event_model import ChatEvent
from app.features.common.schemas.common_schemas import BaseResponse, PaginatedResponseData

# --- Type Alias for Message Types ---
MessageType = Literal['text', 'error', 'tool_use']

# --- Core Data Models --- 

class MessageData(BaseModel):
    """Core data representation for a message."""
    sender_type: Literal['user', 'agent'] = 'user'
    content: str
    author_id: Optional[PydanticObjectId] = None
    created_at: datetime
    type: MessageType = 'text'
    tool_name: Optional[str] = None
    is_final: bool = True

    model_config = {
        "from_attributes": True,
        "populate_by_name": True,
        "json_schema_extra": {
            "example": {
                "id": "60d5ec49abf8a7b6a0f3e8f1",
                "sender_type": "user",
                "content": "Hello there!",
                "author_id": "60d5ec49abf8a7b6a0f3e8f1",
                "created_at": "2023-01-01T12:00:00Z",
                "type": "text",
                "tool_name": None
            }
        }
    }

# --- Tool Invocation Schema ---
class ToolInvocationData(BaseModel):
    """Core data representation for a tool invocation event."""
    chat_id: PydanticObjectId
    tool_name: str
    input_payload: Dict[str, Any]
    output_payload: Optional[Dict[str, Any]] = None
    status: Literal['started', 'in_progress', 'completed', 'error']
    created_at: datetime

    model_config = {
        "from_attributes": True,
        "populate_by_name": True,
        "json_encoders": {
            datetime: lambda dt: dt.isoformat().replace('+00:00', 'Z') if dt.tzinfo else dt.isoformat()
        }
    }

class ChatData(BaseModel):
    """Core data representation for a chat."""
    id: PydanticObjectId = Field(..., alias="_id")
    name: Optional[str] = None
    owner_id: PydanticObjectId
    created_at: datetime
    updated_at: datetime
    latest_message_content: Optional[str] = None
    latest_message_timestamp: Optional[datetime] = None

    model_config = {
        "from_attributes": True,
        "populate_by_name": True,
        "json_schema_extra": {
            "example": {
                 "id": "60d5ec49abf8a7b6a0f3e8f2",
                 "name": "User's Chat",
                 "owner_id": "60d5ec49abf8a7b6a0f3e8f1",
                 "created_at": "2023-01-01T12:00:00Z",
                 "updated_at": "2023-01-01T12:00:00Z",
                 "latest_message_content": "Hello there!",
                 "latest_message_timestamp": "2023-01-01T12:05:00Z",
             }
        }
    }

# --- Request Payloads (Inputs) --- 

class MessageCreate(BaseModel):
    sender_type: Literal['user', 'agent'] = 'user'
    content: str

class ChatCreate(BaseModel):
    name: Optional[str] = None

# Add schema for updating chat details
class ChatUpdate(BaseModel):
    name: Optional[str] = None

# --- Screenshot Schema ---
class ScreenshotData(BaseModel):
    """Core data representation for a screenshot."""
    id: PydanticObjectId = Field(..., alias="_id")
    chat_id: PydanticObjectId
    created_at: datetime
    image_data: str # The full data URI
    page_summary: Optional[str] = None
    evaluation_previous_goal: Optional[str] = None
    memory: Optional[str] = None
    next_goal: Optional[str] = None

    model_config = {
        "from_attributes": True,
        "populate_by_name": True,
        "json_schema_extra": {
            "example": {
                "id": "67fd1234abcd1234abcd1234",
                "chat_id": "60d5ec49abf8a7b6a0f3e8f2",
                "created_at": "2023-01-01T12:05:30Z",
                "image_data": "data:image/png;base64,iVBORw0KG...",
                "page_summary": "Page summary",
                "evaluation_previous_goal": "Evaluation previous goal",
                "memory": "Memory",
                "next_goal": "Next goal"
            }
        }
    }

# --- API Response Schemas (Outputs using BaseResponse) --- 

class GetChatsResponse(BaseResponse[PaginatedResponseData[ChatData]]):
    """Response schema for listing chats."""
    pass

class GetChatMessagesResponse(BaseResponse[PaginatedResponseData[MessageData]]):
    """Response schema for getting paginated messages for a chat."""
    pass

class GetChatDetailsResponse(BaseResponse[ChatData]):
    """Response schema for getting basic chat details (no messages)."""
    pass

class CreateChatResponse(BaseResponse[ChatData]):
    """Response schema after creating a new chat (no messages)."""
    pass

class AddMessageResponse(BaseResponse[MessageData]):
    """Response schema after adding a new message."""
    pass

class GetChatScreenshotsResponse(BaseResponse[PaginatedResponseData[ScreenshotData]]):
    """Response schema for getting screenshots for a chat."""
    pass

class GetChatEventsResponse(BaseResponse[PaginatedResponseData[ChatEvent]]):
    """Response schema for getting merged chat events."""
    pass
