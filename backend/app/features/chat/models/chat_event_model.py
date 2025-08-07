from beanie import Document, PydanticObjectId
from pydantic import Field, BaseModel
from datetime import datetime, timezone
from typing import Literal, Union, Optional, Dict, Any, List
from enum import Enum

class AuthorType(str, Enum):
    USER = "user"
    AGENT = "agent"

class ChatEventType(str, Enum):
    MESSAGE = "message"
    TOOL = "tool"
    REASONING = "reasoning"
    ERROR = "error"

class ToolStatus(str, Enum):
    STARTED = "started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ERROR = "error"

class ToolExecution(BaseModel):
    """Individual tool execution within a tool trajectory."""
    tool_name: str = Field(...)
    input_payload: Dict[str, Any] = Field(default_factory=dict)
    output_payload: Optional[Dict[str, Any]] = Field(default=None)
    error: Optional[str] = Field(default=None)
    status: ToolStatus = Field(default=ToolStatus.STARTED)
    started_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    completed_at: Optional[datetime] = Field(default=None)

class ToolPayload(BaseModel):
    """Tool payload supporting trajectory of multiple tool executions."""
    status: ToolStatus = Field(default=ToolStatus.STARTED)
    tool_calls: List[ToolExecution] = Field(default_factory=list)

class ReasoningPayload(BaseModel):
    trajectory: List[str] = Field(default_factory=list)
    status: Literal["thinking", "complete"] = Field(default="thinking")

class ChatEvent(Document):
    """Unified event model for chat messages and tool invocations."""
    id: PydanticObjectId = Field(default_factory=PydanticObjectId, alias="_id")
    chat_id: PydanticObjectId = Field(default_factory=PydanticObjectId)
    author: AuthorType = Field(default=AuthorType.USER)
    type: ChatEventType = Field(default=ChatEventType.MESSAGE)
    content: str = Field(default="")
    payload: Optional[Union[ToolPayload, ReasoningPayload]] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    class Settings:
        name = "chat_events"
        indexes = [
            [("chat_id", 1), ("created_at", -1)]  # Compound index for efficient pagination
        ]

    class Config:
        json_schema_extra = {
            "example": {
                "_id": "60d5ec49abf8a7b6a0f3e8f1",
                "chat_id": "60d5ec49abf8a7b6a0f3e8f1",
                "author": "user",
                "type": "tool",
                "content": "Executing SQL query...",
                "payload": {
                    "tool_name": "sql",
                    "input_payload": {"query": "SELECT * FROM users"},
                    "output_payload": {"result": "User data"},
                    "status": "completed"
                },
                "created_at": "2023-01-01T12:00:00Z",
                "updated_at": "2023-01-01T12:00:00Z"
            }
        } 