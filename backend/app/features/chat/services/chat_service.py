from typing import List, Optional, TYPE_CHECKING, Literal, Dict, Any, Union
from datetime import datetime, timezone
import json
import dspy
import os
import uuid

from ..models import Chat
from ..schemas import ChatCreate, ChatUpdate
from app.features.common.schemas.common_schemas import PaginatedResponseData
from app.features.common.exceptions import AppException
from app.config.environment import environment
if TYPE_CHECKING:
    from app.config.dependencies import ChatRepositoryDep, WebSocketRepositoryDep
    from app.features.chat.repositories import ChatRepository, WebSocketRepository

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
    """Service layer for chat operations - uses Redis and WebSocket for real-time messaging."""
    def __init__(
        self,
        chat_repository: 'ChatRepositoryDep',
        websocket_repository: 'WebSocketRepositoryDep'
    ):
        self.chat_repository = chat_repository
        self.websocket_repository = websocket_repository
        self.current_session_token = None  # Will be set by the agent service context

    def set_session_context(self, session_token: str):
        """Set the session token for Redis operations."""
        self.current_session_token = session_token

    async def create_new_chat(self, chat_data: ChatCreate, owner_id: str) -> Chat:
        """DEPRECATED: Service layer function to create a new chat - use RedisChatService instead."""
        raise NotImplementedError("Chat operations moved to Redis. Use RedisChatService instead.")

    async def get_chats_for_user(
        self, 
        owner_id: str,
        limit: int,
        before_timestamp: Optional[datetime]
    ) -> PaginatedResponseData[Chat]:
        """DEPRECATED: Service layer function to get chats for a user - use RedisChatService instead."""
        raise NotImplementedError("Chat operations moved to Redis. Use RedisChatService instead.")

    async def get_chat_by_id(self, chat_id: str, owner_id: str) -> Chat:
        """DEPRECATED: Gets chat details - use RedisChatService instead."""
        raise NotImplementedError("Chat operations moved to Redis. Use RedisChatService instead.")
        
    async def get_chat_events_for_chat(
        self,
        chat_id: str,
        owner_id: str,
        limit: int,
        before_timestamp: Optional[datetime]
    ) -> PaginatedResponseData[Dict[str, Any]]:
        """Service to get chat events - disabled as MongoDB dependencies removed."""
        print("Chat events retrieval disabled - MongoDB dependencies removed")
        return PaginatedResponseData(
            items=[],
            has_more=False,
            next_cursor_timestamp=None
        )

    async def update_chat_details(
        self,
        chat_id: str,
        update_data: ChatUpdate,
        owner_id: str
    ) -> Chat:
        """DEPRECATED: Updates a chat's name - use RedisChatService instead."""
        raise NotImplementedError("Chat operations moved to Redis. Use RedisChatService instead.")

    async def get_screenshots_for_chat(
        self,
        chat_id: str,
        owner_id: str,
        limit: int,
        before_timestamp: Optional[datetime] = None
    ) -> PaginatedResponseData[Dict[str, Any]]:
        """Service layer function to get screenshots - disabled as MongoDB dependencies removed."""
        print("Screenshots retrieval disabled - MongoDB dependencies removed")
        return PaginatedResponseData(
            items=[],
            has_more=False,
            next_cursor_timestamp=None,
            total_items=0
        )
    
    async def delete_chat(
        self,
        chat_id: str,
        owner_id: str
    ) -> None:
        """DEPRECATED: Deletes a chat and all its related data - use RedisChatService instead."""
        raise NotImplementedError("Chat operations moved to Redis. Use RedisChatService instead.")
    
    async def _generate_chat_title(self, chat: Chat) -> Optional[str]:
        """Generate a title for the chat based on recent messages."""
        try:
            if not self.current_session_token:
                return None
                
            from app.config.dependencies.services import get_redis_chat_service
            redis_service = get_redis_chat_service()
            
            # Convert ObjectId back to UUID for Redis operations
            chat_id_str = str(chat.id)
            redis_uuid = await redis_service._objectid_to_uuid(chat_id_str, self.current_session_token)
            
            # Get recent messages to generate title from
            messages = await redis_service.get_messages_for_chat(
                redis_uuid, self.current_session_token, limit=5, offset=0
            )
            
            if not messages or len(messages) < 2:  # Need at least user + agent message
                return None
            
            # Build conversation text from messages for title generation
            conversation_parts = []
            for msg in reversed(messages):  # Reverse to get chronological order
                role = msg.get('role', 'user')
                content = msg.get('content', '')
                if content and len(content.strip()) > 0:
                    conversation_parts.append(f"{role}: {content[:200]}")  # Limit message length
            
            conversation = "\n".join(conversation_parts)
            
            if not conversation.strip():
                return None
            
            # Use DSPy to generate the title
            import dspy
            from app.config.environment import environment
            
            # Configure DSPy
            lm = dspy.LM(
                model="openai/gpt-4o",
                api_key=environment.OPENAI_API_KEY,
                max_tokens=50,
                temperature=0.3
            )
            dspy.configure(lm=lm)
            
            # Generate title using the signature
            title_generator = dspy.Predict(ChatTitleGenerator)
            result = title_generator(conversation=conversation)
            
            generated_title = result.title.strip()
            
            # Validate title length and content
            if generated_title and 2 <= len(generated_title.split()) <= 8:
                return generated_title
            else:
                return None
                
        except Exception as e:
            return None

    async def send_user_message(self, chat: Chat, content: str) -> None:
        """Helper to broadcast a user text message using Redis and WebSocket."""
        await self._broadcast_message(chat, content, "user", "message")

    async def send_agent_message(self, chat: Chat, content: str) -> None:
        """Helper to broadcast an agent text message using Redis and WebSocket."""
        await self._broadcast_message(chat, content, "agent", "message")

    async def send_error_message(self, chat: Chat, content: str) -> None:
        """Helper to broadcast an agent error message using Redis and WebSocket."""
        await self._broadcast_message(chat, content, "agent", "error")

    async def send_chat_title_update(self, chat: Chat, new_title: str) -> None:
        """Helper to broadcast a chat title update using WebSocket."""
        try:
            from datetime import datetime, timezone
            current_time = datetime.now(timezone.utc).isoformat()
            
            # Create title update data for WebSocket broadcast
            title_update_data = {
                "type": "chat_title_updated",
                "data": {
                    "chat_id": str(chat.id),
                    "title": new_title,
                    "updated_at": current_time
                }
            }
            
            # Broadcast via WebSocket to connected clients
            import json
            message_json = json.dumps(title_update_data)
            await self.websocket_repository.broadcast_to_chat(message_json, str(chat.id))
            
            # Also update the chat name in Redis
            if self.current_session_token:
                from app.config.dependencies.services import get_redis_chat_service
                redis_service = get_redis_chat_service()
                
                # Convert ObjectId back to UUID for Redis operations
                chat_id_str = str(chat.id)
                redis_uuid = await redis_service._objectid_to_uuid(chat_id_str, self.current_session_token)
                
                # Update chat name in Redis
                await redis_service.update_chat_name(redis_uuid, self.current_session_token, new_title)
                
        except Exception as e:
            # Don't fail the main process if title update fails
            pass

    async def send_reasoning_message(self, chat: Chat, content: str, trajectory: List[str], status: str = "thinking", message_id: str = None, timestamp: str = None) -> None:
        """Helper to broadcast an agent reasoning message using Redis and WebSocket."""
        # Frontend expects specific status values: 'thinking' | 'complete'
        frontend_status = "complete" if status == "complete" else "thinking"
        
        reasoning_payload = {
            "trajectory": trajectory,  # Frontend expects trajectory first
            "status": frontend_status
        }
        print(f"[DEBUG] 🧠 Broadcasting reasoning message with status: {frontend_status}, content: {content[:30]}...")
        await self._broadcast_message(chat, content, "agent", "reasoning", reasoning_payload, message_id, timestamp)

    async def send_tool_message(self, chat: Chat, tool_name: str, input_payload: Dict[str, Any], message_id: str = None) -> None:
        """Helper to broadcast a tool message using Redis and WebSocket."""
        # Create frontend-compatible tool payload
        from datetime import datetime, timezone
        current_time = datetime.now(timezone.utc).isoformat()
        
        tool_execution = {
            "tool_name": get_tool_display_name(tool_name),
            "input_payload": input_payload,
            "output_payload": None,
            "error": None,
            "status": "started",
            "started_at": current_time,
            "completed_at": None
        }
        
        tool_payload = {
            "status": "started",
            "tool_calls": [tool_execution]
        }
        
        await self._broadcast_message(chat, get_tool_display_name(tool_name), "agent", "tool", tool_payload, message_id)
        
        # Store tool message in Redis
        await self._update_tool_message_in_redis(chat, get_tool_display_name(tool_name), tool_payload, message_id)

    async def send_tool_update(self, chat: Chat, tool_name: str, status: str, output_payload: Optional[Dict[str, Any]] = None, input_payload: Dict[str, Any] = None, message_id: str = None) -> None:
        """Helper to broadcast tool updates using Redis and WebSocket."""
        # Create frontend-compatible tool payload  
        from datetime import datetime, timezone
        current_time = datetime.now(timezone.utc).isoformat()
        
        # Map backend status to frontend status
        frontend_status = "completed" if status == "completed" else "error" if status == "error" else "in_progress"
        
        tool_execution = {
            "tool_name": get_tool_display_name(tool_name),
            "input_payload": input_payload or {},  # Include original input payload
            "output_payload": output_payload,
            "error": None if status == "completed" else "Tool execution failed",
            "status": frontend_status,
            "started_at": current_time,  # We don't track this separately, use current time
            "completed_at": current_time if status in ["completed", "error"] else None
        }
        
        tool_payload = {
            "status": frontend_status,
            "tool_calls": [tool_execution]
        }
        
        content = get_tool_display_name(tool_name)
        await self._broadcast_message(chat, content, "agent", "tool", tool_payload, message_id)
        
        # Store tool update in Redis
        await self._update_tool_message_in_redis(chat, content, tool_payload, message_id)

    async def _broadcast_message(self, chat: Chat, content: str, author: str, msg_type: str, payload: Optional[Dict[str, Any]] = None, message_id: str = None, timestamp: str = None) -> None:
        """Internal helper to broadcast messages via WebSocket and store in Redis."""
        try:
            from datetime import datetime, timezone
            import uuid
            
            # Use provided message_id for reasoning updates, generate new for others
            msg_id = message_id if message_id else str(uuid.uuid4())
            
            # Use provided timestamp or generate current timestamp
            message_timestamp = timestamp if timestamp else datetime.now(timezone.utc).isoformat()
            
            # Create message data for WebSocket broadcast
            message_data = {
                "type": msg_type,
                "_id": msg_id,
                "chat_id": str(chat.id),
                "author": author,
                "content": content,
                "payload": payload,
                "created_at": message_timestamp,
                "updated_at": message_timestamp
            }
            
            # Broadcast via WebSocket to connected clients
            message_json = json.dumps(message_data)
            await self.websocket_repository.broadcast_to_chat(message_json, str(chat.id))
            
            print(f"[DEBUG] Broadcasted {msg_type} message from {author}: {content[:50]}...")
            
            # For agent messages, also store in Redis for chat history
            # Note: Tool messages are handled separately by _update_tool_message_in_redis
            if author == "agent" and msg_type in ["message", "error", "reasoning"]:
                try:
                    if self.current_session_token:
                        # Store in Redis using the Redis chat service
                        from app.config.dependencies.services import get_redis_chat_service
                        redis_service = get_redis_chat_service()
                        
                        # Convert ObjectId back to UUID for Redis operations
                        chat_id_str = str(chat.id)
                        redis_uuid = await redis_service._objectid_to_uuid(chat_id_str, self.current_session_token)
                        
                        # For reasoning messages, use upsert to preserve original timestamp on updates
                        if msg_type == "reasoning" and msg_id:
                            print(f"[DEBUG] 🧠 Upserting reasoning message {msg_id} with status: {payload.get('status', 'unknown') if payload else 'no-payload'}")
                            await redis_service.upsert_message(
                                redis_uuid, 
                                self.current_session_token, 
                                content, 
                                "agent",
                                payload,  # Store payload as metadata
                                msg_id,   # Use the provided message ID
                                message_timestamp  # Use the consistent timestamp (preserved on updates)
                            )
                            print(f"[DEBUG] ✅ Reasoning message {msg_id} upserted successfully")
                        else:
                            # For other message types, always add new
                            await redis_service.add_message(
                                redis_uuid, 
                                self.current_session_token, 
                                content, 
                                "agent", 
                                payload,  # Store payload as metadata
                                msg_id,   # Use the provided message ID
                                message_timestamp  # Use the consistent timestamp
                            )
                        print(f"[DEBUG] ✅ Agent message stored in Redis for chat history")
                        
                    else:
                        print(f"[DEBUG] ⚠️  Agent message not stored in Redis (no session token)")
                    
                except Exception as e:
                    print(f"[DEBUG] ❌ Error storing agent message in Redis: {e}")
                    # Don't fail the broadcast if storage fails
                    
        except Exception as e:
            print(f"Error broadcasting message: {e}")
            # Don't raise the exception to avoid breaking the agent flow
    
    async def _update_tool_message_in_redis(self, chat: Chat, content: str, payload: Dict[str, Any], message_id: str) -> None:
        """Update a tool message in Redis instead of creating a new one."""
        try:
            if self.current_session_token and message_id:
                from app.config.dependencies.services import get_redis_chat_service
                redis_service = get_redis_chat_service()
                
                # Convert ObjectId back to UUID for Redis operations
                chat_id_str = str(chat.id)
                redis_uuid = await redis_service._objectid_to_uuid(chat_id_str, self.current_session_token)
                
                # Try to update the existing message, if it fails, create a new one
                try:
                    await redis_service.update_message(
                        redis_uuid, 
                        self.current_session_token, 
                        message_id,
                        content, 
                        payload  # Updated payload as metadata
                    )
                    print(f"[DEBUG] ✅ Tool message updated in Redis")
                except Exception as update_error:
                    print(f"[DEBUG] ⚠️ Tool message update failed, creating new: {update_error}")
                    # Fall back to creating the message if update fails (first time)
                    await redis_service.add_message(
                        redis_uuid, 
                        self.current_session_token, 
                        content, 
                        "agent", 
                        payload,
                        message_id
                    )
                    print(f"[DEBUG] ✅ Tool message created in Redis as fallback")
                    
        except Exception as e:
            print(f"[DEBUG] ❌ Error handling tool message in Redis: {e}")
            # Don't fail the broadcast if storage fails