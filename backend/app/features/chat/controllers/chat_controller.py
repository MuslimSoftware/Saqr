from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect, WebSocketException, Query
from fastapi.websockets import WebSocketState
from beanie import PydanticObjectId
from pydantic import ValidationError
from datetime import datetime
from typing import Optional
from ..schemas import ChatData
from .websocket_controller import WebSocketController
from app.features.common.exceptions import AppException
from ..schemas import (
    ChatCreate,
    GetChatsResponse,
    GetChatDetailsResponse,
    CreateChatResponse,
    GetChatScreenshotsResponse,
    GetChatEventsResponse,
    ChatUpdate,
)
from app.config.dependencies import (
    ChatServiceDep, 
    RedisChatServiceDep,
    UserDep, 
    WebSocketRepositoryDep,
    CurrentUserWsDep,
    AgentServiceDep,
)
from app.features.common.schemas.common_schemas import PaginatedResponseData

router = APIRouter(
    prefix="/chats",
    tags=["Chat"]
)

def is_demo_user(user) -> bool:
    """Check if user is a demo session user."""
    return hasattr(user, '_session_token') and user._session_token.startswith("demo-session-")

def get_session_token(user) -> str:
    """Get session token from demo user."""
    if hasattr(user, '_session_token'):
        return user._session_token
    return str(user.id)  # Fallback for regular users

# --- WebSocket Endpoint --- #

@router.websocket("/ws/{chat_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    chat_id: str,
    websocket_repository: WebSocketRepositoryDep,
    current_user: CurrentUserWsDep,
    chat_service: ChatServiceDep,
    agent_service: AgentServiceDep,
):
    """Handles WebSocket connection setup and teardown, delegates processing to WebSocketController."""
    # Both demo and regular users now send ObjectIds from frontend
    try:
        chat_id_obj = PydanticObjectId(chat_id)
    except Exception:
        await websocket.accept()
        await websocket.close(code=status.WS_1007_INVALID_FRAMEWORK_PAYLOAD_DATA, reason="Invalid chat ID format")
        return

    # Get Redis service dependency
    from app.config.dependencies.services import get_redis_chat_service
    redis_chat_service = get_redis_chat_service()
    
    controller = WebSocketController(
        websocket=websocket,
        chat_id_obj=chat_id_obj,
        current_user=current_user,
        websocket_repository=websocket_repository,
        chat_service=chat_service,
        agent_service=agent_service,
        redis_chat_service=redis_chat_service
    )

    await controller.handle_connect()

    try:
        await controller.run_message_loop()
    except Exception as e:
        print(f"WS Endpoint: Unhandled exception from controller loop for chat {chat_id}: {e}")
        if websocket.client_state != WebSocketState.DISCONNECTED:
            try:
                 await websocket.close(code=status.WS_1011_INTERNAL_ERROR)
            except RuntimeError:
                 pass
    finally:
        controller.handle_disconnect()

# --- REST Endpoints --- #

@router.post("/", response_model=CreateChatResponse, status_code=status.HTTP_201_CREATED)
async def create_chat(
    chat_in: ChatCreate,
    current_user: UserDep,
    chat_service: ChatServiceDep,
    redis_chat_service: RedisChatServiceDep
) -> CreateChatResponse:
    # All users now use Redis service
    session_token = get_session_token(current_user)
    created_chat = await redis_chat_service.create_new_chat(session_token, chat_in.name)
    return CreateChatResponse(data=created_chat)

@router.get("/", response_model=GetChatsResponse)
async def get_user_chats(
    current_user: UserDep,
    chat_service: ChatServiceDep,
    redis_chat_service: RedisChatServiceDep,
    limit: int = Query(default=20, gt=0, le=100),
    before_timestamp: Optional[datetime] = Query(default=None)
) -> GetChatsResponse:
    """Gets a paginated list of chats for the current user."""
    # All users now use Redis service
    session_token = get_session_token(current_user)
    paginated_chats = await redis_chat_service.get_chats_for_user(
        session_token, limit, before_timestamp
    )
    return GetChatsResponse(data=paginated_chats)

@router.get("/{chat_id}", response_model=GetChatDetailsResponse)
async def get_chat_details(
    chat_id: str,  # Changed to accept string ObjectId from frontend
    current_user: UserDep,
    redis_chat_service: RedisChatServiceDep
) -> GetChatDetailsResponse:
    """Gets basic details for a specific chat (name, dates, etc.), excluding messages."""
    session_token = get_session_token(current_user)
    # Convert ObjectId back to UUID for Redis operations
    try:
        redis_uuid = await redis_chat_service._objectid_to_uuid(chat_id, session_token)
    except ValueError:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    chat = await redis_chat_service.get_chat_by_id(redis_uuid, session_token)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Transform Redis chat data to match expected response format
    chat_data = {
        "id": PydanticObjectId(chat_id),  # Use the ObjectId format for response
        "name": chat["name"],
        "created_at": datetime.fromisoformat(chat["created_at"]),
        "updated_at": datetime.fromisoformat(chat["updated_at"]),
        "owner_id": PydanticObjectId(),  # Dummy for demo sessions
        "latest_message_content": chat.get("latest_message_content"),
        "latest_message_timestamp": datetime.fromisoformat(chat["latest_message_timestamp"]) if chat.get("latest_message_timestamp") else None
    }
    
    response_data = ChatData.model_validate(chat_data)
    return GetChatDetailsResponse(data=response_data)

@router.patch("/{chat_id}", response_model=GetChatDetailsResponse)
async def update_chat(
    chat_id: str,  # Changed to accept string ObjectId from frontend
    update_payload: ChatUpdate,
    current_user: UserDep,
    redis_chat_service: RedisChatServiceDep
) -> GetChatDetailsResponse:
    """Updates the name of a specific chat."""
    session_token = get_session_token(current_user)
    # Convert ObjectId back to UUID for Redis operations
    try:
        redis_uuid = await redis_chat_service._objectid_to_uuid(chat_id, session_token)
    except ValueError:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    # Update chat name
    updated_chat = await redis_chat_service.update_chat_name(redis_uuid, session_token, update_payload.name)
    
    # Transform Redis chat data to match expected response format
    chat_data = {
        "id": PydanticObjectId(chat_id),  # Use the ObjectId format for response
        "name": updated_chat["name"],
        "created_at": datetime.fromisoformat(updated_chat["created_at"]),
        "updated_at": datetime.fromisoformat(updated_chat["updated_at"]),
        "owner_id": PydanticObjectId(),  # Dummy for demo sessions
        "latest_message_content": updated_chat.get("latest_message_content"),
        "latest_message_timestamp": datetime.fromisoformat(updated_chat["latest_message_timestamp"]) if updated_chat.get("latest_message_timestamp") else None
    }
    
    updated_chat_data = ChatData.model_validate(chat_data)
    return GetChatDetailsResponse(data=updated_chat_data)

@router.get("/{chat_id}/messages", response_model=GetChatEventsResponse)
async def get_chat_events(
    chat_id: str,  # Accept ObjectId string from frontend
    current_user: UserDep,
    chat_service: ChatServiceDep,
    redis_chat_service: RedisChatServiceDep,
    limit: int = Query(default=20, gt=0, le=100),
    before_timestamp: Optional[datetime] = Query(default=None)
) -> GetChatEventsResponse:
    """Gets a paginated list of chat events (messages + invocations) for a specific chat."""
    # All users now use Redis service
    session_token = get_session_token(current_user)
    # Convert ObjectId back to UUID for Redis operations
    try:
        redis_uuid = await redis_chat_service._objectid_to_uuid(chat_id, session_token)
    except ValueError:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    messages = await redis_chat_service.get_messages_for_chat(redis_uuid, session_token, limit, 0)
    
    print(f"[DEBUG] Found {len(messages)} messages for chat {chat_id} (UUID: {redis_uuid})")
    if messages:
        print(f"[DEBUG] First message: {messages[0]}")
    
    # Transform messages to ChatEvent format for compatibility
    chat_events = []
    for msg in messages:
        # Parse metadata to check for special message types
        metadata = msg.get("metadata", {})
        msg_type = "message"
        payload = None
        
        # Check for different message types based on metadata
        if isinstance(metadata, dict):
            if "tool_calls" in metadata:
                # This is a tool message
                msg_type = "tool"
                payload = metadata
            elif "trajectory" in metadata or "status" in metadata:
                # This is a reasoning message
                msg_type = "reasoning"
                payload = metadata
        
        chat_event = {
            "_id": msg["id"],
            "chat_id": chat_id,
            "author": "user" if msg["role"] == "user" else "agent",
            "type": msg_type,
            "content": msg["content"],
            "payload": payload,
            "created_at": datetime.fromisoformat(msg["timestamp"]),
            "updated_at": datetime.fromisoformat(msg["timestamp"])
        }
        chat_events.append(chat_event)
    
    # Create paginated response
    from app.features.common.schemas.common_schemas import PaginatedResponseData
    paginated_events = PaginatedResponseData(
        items=chat_events,
        has_more=False,  # For now, don't implement pagination
        next_cursor_timestamp=None,
        total_items=len(chat_events)
    )
    
    return GetChatEventsResponse(data=paginated_events)

@router.get("/{chat_id}/screenshots", response_model=GetChatScreenshotsResponse)
async def get_chat_screenshots(
    chat_id: str,  # Changed to accept string ObjectId from frontend
    current_user: UserDep,
    redis_chat_service: RedisChatServiceDep,
    limit: int = Query(default=5, gt=0, le=100), 
    before_timestamp: Optional[datetime] = Query(default=None) 
) -> GetChatScreenshotsResponse:
    """Gets a paginated list of screenshot data URIs for a specific chat."""
    session_token = get_session_token(current_user)
    
    try:
        # Convert ObjectId back to UUID for Redis operations
        redis_uuid = await redis_chat_service._objectid_to_uuid(chat_id, session_token)
    except ValueError:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    try:
        # Get screenshots from Redis
        screenshots = await redis_chat_service.get_chat_screenshots_for_redis(
            redis_uuid, session_token, limit, before_timestamp
        )
        
        # Convert screenshot data to match frontend expectations and bypass Pydantic validation issues
        formatted_screenshots = []
        for screenshot in screenshots:
            formatted_screenshot = {
                "_id": screenshot["_id"],  # UUID string
                "chat_id": chat_id,  # Use ObjectId string that frontend expects  
                "created_at": screenshot["created_at"].isoformat() if hasattr(screenshot["created_at"], 'isoformat') else screenshot["created_at"],
                "image_data": screenshot["image_data"],
                "memory": screenshot.get("memory"),
                "page_summary": None,  # Default values for optional fields
                "evaluation_previous_goal": None,
                "next_goal": None,
            }
            formatted_screenshots.append(formatted_screenshot)
        
        # Create response data directly as dict to avoid Pydantic validation issues
        response_data = {
            "items": formatted_screenshots,
            "has_more": len(formatted_screenshots) == limit,
            "next_cursor_timestamp": formatted_screenshots[-1]['created_at'] if formatted_screenshots and len(formatted_screenshots) == limit else None,
            "total_items": len(formatted_screenshots)
        }
        
        
        # Return response as dict to avoid Pydantic schema validation
        from fastapi.responses import JSONResponse
        return JSONResponse(content={"success": True, "message": None, "data": response_data})
        
    except Exception as e:
        print(f"[ERROR] Failed to get screenshots for chat {chat_id}: {e}")
        # Return empty response on error to avoid breaking the frontend
        from app.features.common.schemas.common_schemas import PaginatedResponseData
        empty_screenshots = PaginatedResponseData(
            items=[],
            has_more=False,
            next_cursor_timestamp=None,
            total_items=0
        )
        return GetChatScreenshotsResponse(data=empty_screenshots) 

@router.delete("/{chat_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat(
    chat_id: str,  # Changed to accept string ObjectId from frontend
    current_user: UserDep,
    redis_chat_service: RedisChatServiceDep
) -> None:
    """Deletes a chat and all its related data (messages, screenshots, etc.)."""
    session_token = get_session_token(current_user)
    # Convert ObjectId back to UUID for Redis operations
    try:
        redis_uuid = await redis_chat_service._objectid_to_uuid(chat_id, session_token)
    except ValueError:
        raise HTTPException(status_code=404, detail="Chat not found")
    
    await redis_chat_service.delete_chat(redis_uuid, session_token) 