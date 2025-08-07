from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import json
import uuid
import hashlib
from beanie import PydanticObjectId

from app.infrastructure.caching.redis import RedisStorage, RedisSessionManager
from app.features.common.schemas.common_schemas import PaginatedResponseData
from app.features.common.exceptions import AppException


def uuid_to_objectid(uuid_str: str) -> PydanticObjectId:
    """Convert a UUID string to a consistent PydanticObjectId."""
    # Create a 12-byte hash from the UUID to make a valid ObjectId
    hash_bytes = hashlib.md5(uuid_str.encode()).digest()[:12]
    return PydanticObjectId(hash_bytes.hex())

# We need to maintain a mapping to reverse the conversion
# For now, we'll store both the ObjectId and UUID, but in a real implementation
# we'd need a proper reverse mapping or store this in Redis

class RedisChatService:
    """Redis-based chat service for demo sessions."""
    
    def __init__(self):
        self.redis_storage = RedisStorage()
        self.session_manager = RedisSessionManager()
    
    def _extract_session_token(self, user_id: str) -> str:
        """Extract session token from user ID."""
        if isinstance(user_id, str) and user_id.startswith("demo-session-"):
            return user_id
        raise ValueError("Invalid session user ID")
    
    async def _objectid_to_uuid(self, object_id: str, session_token: str) -> str:
        """Convert ObjectId back to UUID by finding the chat in Redis."""
        print(f"[DEBUG] Converting ObjectId {object_id} back to UUID for session {session_token}")
        
        # Get all chats for this session and find the one with matching ObjectId
        chats = await self.redis_storage.get_chats(session_token)
        print(f"[DEBUG] Found {len(chats)} chats in session")
        
        for chat in chats:
            chat_oid = uuid_to_objectid(chat["id"])
            print(f"[DEBUG] Chat UUID: {chat['id']} -> ObjectId: {str(chat_oid)}")
            if str(chat_oid) == object_id:
                print(f"[DEBUG] Found matching chat: {chat['id']}")
                return chat["id"]
        
        print(f"[DEBUG] No matching chat found for ObjectId {object_id}")
        raise ValueError(f"Chat with ObjectId {object_id} not found for session")
    
    async def create_new_chat(self, user_id: str, chat_name: Optional[str] = None) -> Dict[str, Any]:
        """Create a new chat for a demo session."""
        session_token = self._extract_session_token(user_id)
        
        try:
            chat_data = await self.redis_storage.create_chat(session_token, chat_name)
            
            # Transform Redis data to match ChatData schema
            # Convert UUID to ObjectId for schema compatibility, but store original UUID for Redis operations
            chat_object_id = uuid_to_objectid(chat_data["id"])
            
            transformed_data = {
                "_id": chat_object_id,  # Use converted ObjectId for schema
                "id": chat_object_id,   # Also provide without alias  
                "name": chat_data["name"],
                "owner_id": PydanticObjectId(),  # Generate a dummy owner_id for demo sessions
                "created_at": datetime.fromisoformat(chat_data["created_at"]),
                "updated_at": datetime.fromisoformat(chat_data["updated_at"]),
                "latest_message_content": chat_data.get("latest_message_content"),
                "latest_message_timestamp": datetime.fromisoformat(chat_data["latest_message_timestamp"]) if chat_data.get("latest_message_timestamp") else None
            }
            
            # Store the original UUID for internal use
            transformed_data["_redis_uuid"] = chat_data["id"]
            
            return transformed_data
        except ValueError as e:
            if "Invalid session" in str(e):
                raise AppException(status_code=401, error_code="SESSION_EXPIRED", message="Demo session expired")
            elif "Maximum chats" in str(e):
                raise AppException(status_code=429, error_code="CHAT_LIMIT_EXCEEDED", message="Maximum chats per session exceeded")
            raise AppException(status_code=500, error_code="CHAT_CREATION_FAILED", message=str(e))
    
    async def get_chats_for_user(self, user_id: str, limit: int = 50, before_timestamp: Optional[datetime] = None) -> PaginatedResponseData:
        """Get chats for a demo session."""
        session_token = self._extract_session_token(user_id)
        
        try:
            chats = await self.redis_storage.get_chats(session_token)
            
            # Transform Redis data to match ChatData schema
            transformed_chats = []
            for chat in chats:
                chat_object_id = uuid_to_objectid(chat["id"])
                
                transformed_chat = {
                    "_id": chat_object_id,  # Use converted ObjectId for schema
                    "id": chat_object_id,   # Also provide without alias
                    "name": chat["name"],
                    "owner_id": PydanticObjectId(),  # Generate dummy owner_id for demo sessions
                    "created_at": datetime.fromisoformat(chat["created_at"]),
                    "updated_at": datetime.fromisoformat(chat["updated_at"]),
                    "latest_message_content": chat.get("latest_message_content") if chat.get("latest_message_content") else None,
                    "latest_message_timestamp": datetime.fromisoformat(chat["latest_message_timestamp"]) if chat.get("latest_message_timestamp") and chat["latest_message_timestamp"] != "" else None
                }
                
                # Store the original UUID for internal use
                transformed_chat["_redis_uuid"] = chat["id"]
                
                transformed_chats.append(transformed_chat)
            
            # Apply before_timestamp filter if provided
            if before_timestamp:
                transformed_chats = [chat for chat in transformed_chats if chat['created_at'] < before_timestamp]
            
            # Apply pagination
            total_chats = len(transformed_chats)
            has_more = len(transformed_chats) > limit
            items_to_return = transformed_chats[:limit] if has_more else transformed_chats
            
            next_cursor_timestamp = None
            if items_to_return and has_more:
                next_cursor_timestamp = items_to_return[-1]['created_at']
            
            return PaginatedResponseData(
                items=items_to_return,
                has_more=has_more,
                next_cursor_timestamp=next_cursor_timestamp,
                total_items=total_chats
            )
        except Exception as e:
            raise AppException(status_code=500, error_code="CHAT_FETCH_FAILED", message=str(e))
    
    async def get_chat_by_id(self, chat_id: str, user_id: str) -> Dict[str, Any]:
        """Get a specific chat by ID."""
        session_token = self._extract_session_token(user_id)
        
        try:
            chat = await self.redis_storage.get_chat(session_token, chat_id)
            if not chat:
                raise AppException(status_code=404, error_code="CHAT_NOT_FOUND", message="Chat not found")
            return chat
        except AppException:
            raise
        except Exception as e:
            raise AppException(status_code=500, error_code="CHAT_FETCH_FAILED", message=str(e))
    
    async def get_messages_for_chat(self, chat_id: str, user_id: str, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """Get messages for a specific chat."""
        session_token = self._extract_session_token(user_id)
        
        print(f"[DEBUG] Getting messages for chat_id: {chat_id}, session_token: {session_token}")
        
        # First verify chat exists and user has access
        chat = await self.get_chat_by_id(chat_id, user_id)
        print(f"[DEBUG] Chat found: {chat is not None}")
        
        try:
            messages = await self.redis_storage.get_messages(session_token, chat_id, limit, offset)
            print(f"[DEBUG] Raw messages from Redis: {len(messages)}")
            if messages:
                print(f"[DEBUG] First raw message: {messages[0]}")
            return messages
        except Exception as e:
            print(f"[DEBUG] Error getting messages: {e}")
            raise AppException(status_code=500, error_code="MESSAGES_FETCH_FAILED", message=str(e))
    
    async def add_message(self, chat_id: str, user_id: str, content: str, role: str = "user", 
                         metadata: Optional[Dict] = None) -> Dict[str, Any]:
        """Add a message to a chat."""
        session_token = self._extract_session_token(user_id)
        
        # Verify chat exists and user has access
        await self.get_chat_by_id(chat_id, user_id)
        
        try:
            message = await self.redis_storage.add_message(session_token, chat_id, content, role, metadata)
            return message
        except ValueError as e:
            if "memory limit exceeded" in str(e).lower():
                raise AppException(status_code=429, error_code="MEMORY_LIMIT_EXCEEDED", message="Session memory limit exceeded")
            elif "maximum messages" in str(e).lower():
                raise AppException(status_code=429, error_code="MESSAGE_LIMIT_EXCEEDED", message="Maximum messages per chat exceeded")
            elif "chat not found" in str(e).lower():
                raise AppException(status_code=404, error_code="CHAT_NOT_FOUND", message="Chat not found")
            raise AppException(status_code=500, error_code="MESSAGE_CREATION_FAILED", message=str(e))
    
    async def store_screenshot(self, chat_id: str, message_id: str, user_id: str, 
                              screenshot_data: bytes, content_type: str = "image/png") -> str:
        """Store a screenshot for a message."""
        session_token = self._extract_session_token(user_id)
        
        # Verify chat exists and user has access
        await self.get_chat_by_id(chat_id, user_id)
        
        try:
            screenshot_id = await self.redis_storage.store_screenshot(
                session_token, chat_id, message_id, screenshot_data, content_type
            )
            return screenshot_id
        except ValueError as e:
            if "memory limit exceeded" in str(e).lower():
                raise AppException(status_code=429, error_code="MEMORY_LIMIT_EXCEEDED", message="Session memory limit exceeded")
            raise AppException(status_code=500, error_code="SCREENSHOT_STORAGE_FAILED", message=str(e))
    
    async def get_screenshot(self, screenshot_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        """Get a screenshot by ID."""
        session_token = self._extract_session_token(user_id)
        
        try:
            screenshot = await self.redis_storage.get_screenshot(session_token, screenshot_id)
            return screenshot
        except Exception as e:
            raise AppException(status_code=500, error_code="SCREENSHOT_FETCH_FAILED", message=str(e))
    
    async def delete_chat(self, chat_id: str, user_id: str) -> None:
        """Delete a chat and all its messages."""
        session_token = self._extract_session_token(user_id)
        
        # Verify chat exists and user has access
        await self.get_chat_by_id(chat_id, user_id)
        
        try:
            # In Redis, we need to manually delete all related data
            # Get all messages for the chat
            messages = await self.redis_storage.get_messages(session_token, chat_id, 10000)  # Get all messages
            
            # Delete each message and associated screenshots
            redis_client = self.redis_storage.redis_client
            pipe = redis_client.pipeline()
            
            for message in messages:
                message_id = message['id']
                # Delete message
                pipe.delete(f"session:{session_token}:chat:{chat_id}:message:{message_id}")
                
                # Delete associated screenshots (if any)
                screenshot_keys = await redis_client.keys(f"session:{session_token}:screenshot:*")
                for screenshot_key in screenshot_keys:
                    screenshot_metadata = await redis_client.hget(screenshot_key, "metadata")
                    if screenshot_metadata:
                        metadata = json.loads(screenshot_metadata)
                        if metadata.get('chat_id') == chat_id and metadata.get('message_id') == message_id:
                            pipe.delete(screenshot_key)
            
            # Delete the chat itself
            pipe.delete(f"session:{session_token}:chat:{chat_id}")
            
            # Update session chat count
            pipe.hincrby(f"session:{session_token}", "chat_count", -1)
            
            await pipe.execute()
            
        except Exception as e:
            raise AppException(status_code=500, error_code="CHAT_DELETION_FAILED", message=str(e))
    
    async def update_chat_name(self, chat_id: str, user_id: str, new_name: str) -> Dict[str, Any]:
        """Update chat name."""
        session_token = self._extract_session_token(user_id)
        
        # Verify chat exists and user has access
        chat = await self.get_chat_by_id(chat_id, user_id)
        
        try:
            # Update chat name in Redis
            chat_key = f"session:{session_token}:chat:{chat_id}"
            await self.redis_storage.redis_client.hset(
                chat_key,
                mapping={
                    "name": new_name,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            )
            
            # Return updated chat data
            updated_chat = await self.redis_storage.get_chat(session_token, chat_id)
            return updated_chat
            
        except Exception as e:
            raise AppException(status_code=500, error_code="CHAT_UPDATE_FAILED", message=str(e))
    
    async def get_session_info(self, user_id: str) -> Dict[str, Any]:
        """Get session information and usage statistics."""
        session_token = self._extract_session_token(user_id)
        
        try:
            session = await self.session_manager.get_session(session_token)
            if not session:
                raise AppException(status_code=401, error_code="SESSION_EXPIRED", message="Demo session expired")
            
            return {
                "session_token": session_token,
                "created_at": session["created_at"],
                "last_accessed": session["last_accessed"],
                "chat_count": session["chat_count"],
                "memory_usage_mb": round(session["memory_usage_bytes"] / (1024 * 1024), 2),
                "memory_limit_mb": 50,  # From redis.py constants
                "expires_in_minutes": 30  # From redis.py constants
            }
        except AppException:
            raise
        except Exception as e:
            raise AppException(status_code=500, error_code="SESSION_INFO_FAILED", message=str(e))