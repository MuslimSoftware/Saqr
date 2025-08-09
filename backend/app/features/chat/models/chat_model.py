from pydantic import BaseModel, Field
from beanie import PydanticObjectId
from datetime import datetime, timezone
from typing import Optional

class Chat(BaseModel):
    """Chat model - Pydantic model without database binding."""
    id: Optional[PydanticObjectId] = Field(default=None)
    name: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    owner_id: PydanticObjectId = Field(...)
    latest_message_content: Optional[str] = Field(default=None)
    latest_message_timestamp: Optional[datetime] = Field(default=None)

    class Config:
        json_schema_extra = {
            "example": {
                "name": "User's Chat",
                "created_at": "2023-01-01T12:00:00Z",
                "updated_at": "2023-01-01T12:00:00Z",
                "owner_id": "60d5ec49abf8a7b6a0f3e8f1"
            }
        }