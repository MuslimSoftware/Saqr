from pydantic import BaseModel, Field
from typing import Optional, Generic, TypeVar, List
from datetime import datetime

# --- Pagination Schemas ---

T = TypeVar('T')

class PaginatedResponseData(BaseModel, Generic[T]):
    """Generic structure for paginated data responses."""

    items: List[T]
    next_cursor_timestamp: Optional[datetime] = None
    has_more: bool = False
    total_items: Optional[int] = None
    
    model_config = {
        "json_encoders": {
            datetime: lambda dt: dt.isoformat().replace('+00:00', 'Z') if dt.tzinfo else dt.isoformat()
        },
        "from_attributes": True
    }

class BaseResponse(BaseModel, Generic[T]):
    """Standard API response wrapper."""
    success: bool = True
    message: Optional[str] = None
    data: Optional[T] = None

class ErrorResponse(BaseModel):
    message: str
    error_code: Optional[str] = None
    status_code: int = 500