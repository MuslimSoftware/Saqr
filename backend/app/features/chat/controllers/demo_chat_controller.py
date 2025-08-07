from fastapi import APIRouter, Depends, HTTPException, status, Query
from datetime import datetime
from typing import Optional

from app.config.dependencies import RedisChatServiceDep, UserDep
from app.features.common.exceptions import AppException
from app.features.common.schemas.common_schemas import BaseResponse


router = APIRouter(
    prefix="/demo/chats",
    tags=["Demo Chat"]
)


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_demo_chat(
    current_user: UserDep,
    redis_chat_service: RedisChatServiceDep,
    chat_name: Optional[str] = None
):
    """Create a new chat in demo mode."""
    try:
        chat_data = await redis_chat_service.create_new_chat(str(current_user.id), chat_name)
        return BaseResponse(
            success=True,
            message="Demo chat created successfully",
            data=chat_data
        )
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/")
async def get_demo_chats(
    current_user: UserDep,
    redis_chat_service: RedisChatServiceDep,
    limit: int = Query(default=20, gt=0, le=100),
    before_timestamp: Optional[datetime] = Query(default=None)
):
    """Get paginated list of demo chats."""
    try:
        paginated_chats = await redis_chat_service.get_chats_for_user(
            str(current_user.id), limit, before_timestamp
        )
        return BaseResponse(
            success=True,
            message="Demo chats retrieved successfully",
            data=paginated_chats
        )
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/{chat_id}")
async def get_demo_chat(
    chat_id: str,
    current_user: UserDep,
    redis_chat_service: RedisChatServiceDep
):
    """Get a specific demo chat by ID."""
    try:
        chat_data = await redis_chat_service.get_chat_by_id(chat_id, str(current_user.id))
        return BaseResponse(
            success=True,
            message="Demo chat retrieved successfully",
            data=chat_data
        )
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/{chat_id}/messages")
async def get_demo_chat_messages(
    chat_id: str,
    current_user: UserDep,
    redis_chat_service: RedisChatServiceDep,
    limit: int = Query(default=50, gt=0, le=200),
    offset: int = Query(default=0, ge=0)
):
    """Get messages for a demo chat."""
    try:
        messages = await redis_chat_service.get_messages_for_chat(
            chat_id, str(current_user.id), limit, offset
        )
        return BaseResponse(
            success=True,
            message="Demo chat messages retrieved successfully",
            data={
                "messages": messages,
                "limit": limit,
                "offset": offset
            }
        )
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post("/{chat_id}/messages")
async def add_demo_message(
    chat_id: str,
    current_user: UserDep,
    redis_chat_service: RedisChatServiceDep,
    content: str,
    role: str = "user"
):
    """Add a message to a demo chat."""
    try:
        message = await redis_chat_service.add_message(
            chat_id, str(current_user.id), content, role
        )
        return BaseResponse(
            success=True,
            message="Message added successfully",
            data=message
        )
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.patch("/{chat_id}")
async def update_demo_chat(
    chat_id: str,
    current_user: UserDep,
    redis_chat_service: RedisChatServiceDep,
    name: str
):
    """Update demo chat name."""
    try:
        updated_chat = await redis_chat_service.update_chat_name(
            chat_id, str(current_user.id), name
        )
        return BaseResponse(
            success=True,
            message="Demo chat updated successfully",
            data=updated_chat
        )
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.delete("/{chat_id}")
async def delete_demo_chat(
    chat_id: str,
    current_user: UserDep,
    redis_chat_service: RedisChatServiceDep
):
    """Delete a demo chat."""
    try:
        await redis_chat_service.delete_chat(chat_id, str(current_user.id))
        return BaseResponse(
            success=True,
            message="Demo chat deleted successfully",
            data={}
        )
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/session/info")
async def get_session_info(
    current_user: UserDep,
    redis_chat_service: RedisChatServiceDep
):
    """Get demo session information and usage statistics."""
    try:
        session_info = await redis_chat_service.get_session_info(str(current_user.id))
        return BaseResponse(
            success=True,
            message="Session info retrieved successfully",
            data=session_info
        )
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/{chat_id}/screenshots/{screenshot_id}")
async def get_demo_screenshot(
    chat_id: str,
    screenshot_id: str,
    current_user: UserDep,
    redis_chat_service: RedisChatServiceDep
):
    """Get a screenshot by ID."""
    try:
        screenshot = await redis_chat_service.get_screenshot(screenshot_id, str(current_user.id))
        if not screenshot:
            raise HTTPException(status_code=404, detail="Screenshot not found")
        
        return BaseResponse(
            success=True,
            message="Screenshot retrieved successfully",
            data=screenshot
        )
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)