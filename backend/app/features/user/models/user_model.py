from beanie import Document
from pydantic import EmailStr, Field
from datetime import datetime

class User(Document):
    """User model for MongoDB using Beanie ODM."""
    email: EmailStr = Field(..., unique=True)
    is_active: bool = Field(default=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    class Settings:
        name = "users"
        use_state_management = True

    class Config:
        json_schema_extra = {
            "example": {
                "email": "user@example.com",
                "is_active": True,
                "created_at": "2021-01-01T00:00:00Z",
                "updated_at": "2021-01-01T00:00:00Z"
            }
        } 