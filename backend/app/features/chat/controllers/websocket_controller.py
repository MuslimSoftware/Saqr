from fastapi import WebSocket, WebSocketDisconnect, status
from beanie import PydanticObjectId
from pydantic import ValidationError
from typing import TYPE_CHECKING, Optional
import traceback
import json
import logging # Add logging

from app.features.chat.schemas.chat_schemas import MessageCreate
from app.features.user.models import User
from app.features.chat.models import Chat

from app.features.agent.services import AgentService

if TYPE_CHECKING:
    from app.features.chat.repositories import WebSocketRepository
    from app.features.chat.services import ChatService
    from app.features.chat.services.redis_chat_service import RedisChatService

def is_demo_user(user) -> bool:
    """Check if user is a demo session user."""
    return hasattr(user, '_session_token') and user._session_token.startswith("demo-session-")

def get_session_token(user) -> str:
    """Get session token from demo user."""
    if hasattr(user, '_session_token'):
        return user._session_token
    return str(user.id)  # Fallback for regular users

logger = logging.getLogger(__name__) # Setup logger

class WebSocketController:

    def __init__(
        self,
        websocket: WebSocket,
        chat_id_obj: PydanticObjectId | str,  # Can be either PydanticObjectId or UUID string
        current_user: User,
        websocket_repository: "WebSocketRepository",
        chat_service: "ChatService",
        agent_service: "AgentService",
        redis_chat_service: "RedisChatService",
    ):
        self.websocket = websocket
        self.chat_id_obj = chat_id_obj
        self.current_user = current_user
        self.websocket_repository = websocket_repository
        self.chat_service = chat_service
        self.redis_chat_service = redis_chat_service
        # Store injected AgentService
        self.agent_service = agent_service
        self.connection_id: str = str(chat_id_obj)
        logger.info(f"WebSocketController initialized for chat {self.connection_id}") # Add log

    async def handle_connect(self):
        """Accept connection and register it."""
        await self.websocket.accept()
        await self.websocket_repository.connect(self.websocket, self.connection_id)
        logger.info(f"WebSocket connected for user {self.current_user.id} on chat {self.connection_id}") # Add log

    def handle_disconnect(self):
        """Unregister the connection."""
        self.websocket_repository.disconnect(self.websocket, self.connection_id)
        logger.info(f"WebSocket disconnected for user {self.current_user.id} on chat {self.connection_id}") # Add log

    async def _process_message(self, data: str):
        """Validates input, saves user message, delegates processing to AgentService and handles output events."""
        message_in: Optional[MessageCreate] = None
        chat: Optional[Chat] = None
        
        try:
            # 1. Validate incoming message format
            message_in = MessageCreate.model_validate_json(data)
            user_content = message_in.content.strip()
            logger.debug(f"WS Controller: Received valid message from user {self.current_user.id} for chat {self.chat_id_obj}: '{user_content[:50]}...'")

            # All users now use Redis - verify chat exists in Redis
            session_token = get_session_token(self.current_user)
            # Convert ObjectId back to UUID for Redis operations
            redis_uuid = await self.redis_chat_service._objectid_to_uuid(str(self.chat_id_obj), session_token)
            redis_chat = await self.redis_chat_service.get_chat_by_id(redis_uuid, session_token)
            if not redis_chat:
                logger.error(f"WS Controller: Error - Chat {self.chat_id_obj} not found for user {self.current_user.id}.")
                await self.websocket.send_text(
                    json.dumps({"type": "error", "content": f"Chat {self.chat_id_obj} not found."})
                )
                return
            
            # Save user message to Redis
            print(f"[DEBUG] Saving user message to Redis for chat {redis_uuid}: {user_content[:50]}...")
            user_message_result = await self.redis_chat_service.add_message(
                redis_uuid, session_token, user_content, "user"
            )
            print(f"[DEBUG] User message saved: {user_message_result}")
            
            # Send user message back to frontend
            from datetime import datetime, timezone
            current_time = datetime.now(timezone.utc).isoformat()
            
            user_response = {
                "type": "message",
                "_id": user_message_result["id"],
                "chat_id": str(self.chat_id_obj),
                "author": "user",
                "content": user_content,
                "payload": None,
                "created_at": current_time,
                "updated_at": current_time
            }
            print(f"[DEBUG] Sending user message WebSocket response: {user_response}")
            await self.websocket.send_text(json.dumps(user_response))
            
            # Create a temporary Chat object for the agent service to use
            print(f"[DEBUG] Creating temporary Chat object for agent processing")
            from app.features.chat.models.chat_model import Chat
            from bson import ObjectId
            
            # Create a temporary MongoDB-style chat object
            temp_chat = Chat(
                id=ObjectId(str(self.chat_id_obj)),  # Use the ObjectId
                owner_id=self.current_user.id,
                name=redis_chat.get("name", "Demo Chat"),
                created_at=datetime.fromisoformat(redis_chat["created_at"]),
                updated_at=datetime.fromisoformat(redis_chat["updated_at"])
            )
            
            print(f"[DEBUG] Processing with agent service for chat {temp_chat.id}")
            
            # Process input via Agent Service (this will handle broadcasting back to WebSocket)
            await self.agent_service.process_user_message(
                chat=temp_chat,
                user_content=user_content,
            )
            
            print(f"[DEBUG] Agent service processing completed")

        except ValidationError as e:
            error_content = f"Invalid message format: {e}"
            logger.warning( # Log as warning, it's a client issue
                f"WS Controller: Invalid message format from {self.current_user.id} on chat {self.chat_id_obj}: {e}"
            )
            try:
                await self.websocket.send_text(
                    json.dumps({"type": "error", "content": error_content})
                )
            except Exception as send_err:
                logger.error(
                    f"WS Controller: Failed to send validation error to user {self.current_user.id}: {send_err}"
                )

        except Exception as e:
            error_content = "An internal error occurred processing your message."
            logger.exception( # Use logger.exception to include traceback
                f"WS Controller: Unhandled error during message processing for user {self.current_user.id} on chat {self.chat_id_obj}: {e}"
            )
            # Attempt to send an error message back via WS
            try:
                # We already created/broadcasted error messages from AgentService if possible.
                # This sends a direct WS message as a fallback.
                 await self.websocket.send_text(json.dumps({"type": "error", "content": error_content}))
            except Exception as send_err:
                 logger.error(f"WS Controller: Failed to send general error to user {self.current_user.id}: {send_err}")

    async def run_message_loop(self):
        """Receive and process messages in a loop."""
        try:
            while True:
                data = await self.websocket.receive_text()
                logger.debug(f"WS Controller: Raw message received on chat {self.connection_id}") # Log raw receive
                await self._process_message(data)
        except WebSocketDisconnect as e: # Catch disconnect specifically
            # Log the disconnect reason/code
            logger.info(
                f"WS Controller: WebSocket disconnected for user {self.current_user.id} on chat {self.connection_id} (Code: {e.code}, Reason: {e.reason})"
            )
            # Disconnect handled in finally block now
        except Exception as e:
            logger.exception( # Log exception with traceback
                f"WS Controller: Unhandled error in message loop for user {self.current_user.id} on chat {self.connection_id}: {e}"
            )
            # Ensure disconnection cleanup happens even after loop error
            # self.handle_disconnect() # Moved to finally
            # Attempt to close gracefully if possible
            try:
                from fastapi.websockets import WebSocketState
                if self.websocket.client_state != WebSocketState.DISCONNECTED:
                     logger.warning(f"WS Controller: Attempting to close websocket due to loop error.")
                     await self.websocket.close(code=status.WS_1011_INTERNAL_ERROR)
            except RuntimeError as re:
                # This might happen if the connection is already closing
                 logger.warning(
                     f"WS Controller: Error closing websocket after loop error (might be expected if already closing): {re}"
                 )
            # Optionally re-raise e if the main endpoint should handle it
            # raise e # Commented out to prevent double handling

# --- Chat Controller Endpoint (No changes needed here) --- 