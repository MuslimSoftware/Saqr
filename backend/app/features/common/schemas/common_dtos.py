from dataclasses import dataclass
from typing import Optional, Dict, TypeVar, Generic
from pydantic import BaseModel

# Define a generic type variable
T = TypeVar('T')

# Make BaseResponse generic
class BaseResponse(BaseModel, Generic[T]):
    success: bool = True
    message: Optional[str] = None
    data: Optional[T] = None

@dataclass
class ServiceResult:
    """Result for service operations."""
    success: bool
    message: str
    data: Optional[Dict] = None