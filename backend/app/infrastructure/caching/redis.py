import redis.asyncio as redis
import json
import uuid
from datetime import datetime, timedelta, timezone
from app.config.environment import environment
from typing import Optional, Dict, List, Any

_redis_pool: Optional[redis.ConnectionPool] = None

# Session configuration
SESSION_EXPIRE_MINUTES = 30
MAX_MEMORY_PER_SESSION_MB = 50  # 50MB per session
MAX_CHATS_PER_SESSION = 100
MAX_MESSAGES_PER_CHAT = 1000

def init_redis_pool():
    """Initialize Redis connection pool."""
    global _redis_pool
    if _redis_pool is None:
        _redis_pool = redis.ConnectionPool(
            host=environment.REDIS_HOST,
            port=environment.REDIS_PORT,
            db=environment.REDIS_DB,
            decode_responses=True
        )

def close_redis_pool():
    """Close Redis connection pool."""
    global _redis_pool
    if _redis_pool:
        _redis_pool = None
        print("Redis pool 'closed' (set to None).") # Log for confirmation

def get_redis_client() -> redis.Redis:
    """Get a Redis client from the pool."""
    if _redis_pool is None:
        raise RuntimeError("Redis pool is not initialized. Call init_redis_pool() first.")
    return redis.Redis(connection_pool=_redis_pool)

class RedisSessionManager:
    """Manages demo sessions in Redis with expiration and memory limits."""
    
    def __init__(self):
        self.redis_client = get_redis_client()
    
    def generate_session_token(self) -> str:
        """Generate a unique session token."""
        return f"demo-session-{uuid.uuid4()}"
    
    async def create_session(self, session_token: str) -> Dict[str, Any]:
        """Create a new demo session."""
        session_data = {
            "token": session_token,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "last_accessed": datetime.now(timezone.utc).isoformat(),
            "chat_count": 0,
            "memory_usage_bytes": 0
        }
        
        session_key = f"session:{session_token}"
        
        # Store session data directly without JSON encoding simple values
        await self.redis_client.hset(
            session_key,
            mapping=session_data
        )
        await self.redis_client.expire(session_key, SESSION_EXPIRE_MINUTES * 60)
        
        return session_data
    
    async def get_session(self, session_token: str) -> Optional[Dict[str, Any]]:
        """Get session data."""
        session_key = f"session:{session_token}"
        session_raw = await self.redis_client.hgetall(session_key)
        
        if not session_raw:
            return None
            
        # Update last accessed time
        await self.redis_client.hset(
            session_key,
            "last_accessed", datetime.now(timezone.utc).isoformat()
        )
        await self.redis_client.expire(session_key, SESSION_EXPIRE_MINUTES * 60)
        
        # Process session data - Redis returns strings, convert as needed
        processed_session = {}
        for k, v in session_raw.items():
            try:
                if k in ['chat_count', 'memory_usage_bytes']:
                    processed_session[k] = int(v)
                else:
                    processed_session[k] = v  # Keep strings as-is
            except ValueError as e:
                processed_session[k] = 0  # Use default value
        
        return processed_session
    
    async def delete_session(self, session_token: str) -> bool:
        """Delete a session and all its data."""
        # Get all chats for this session
        chat_keys = await self.redis_client.keys(f"session:{session_token}:chat:*")
        
        # Delete all chats and their messages
        pipe = self.redis_client.pipeline()
        for chat_key in chat_keys:
            chat_id = chat_key.split(':')[-1]
            message_keys = await self.redis_client.keys(f"session:{session_token}:chat:{chat_id}:messages:*")
            for msg_key in message_keys:
                pipe.delete(msg_key)
            pipe.delete(chat_key)
        
        # Delete session data
        pipe.delete(f"session:{session_token}")
        await pipe.execute()
        
        return True
    
    async def check_memory_limit(self, session_token: str, additional_bytes: int = 0) -> bool:
        """Check if adding data would exceed memory limit."""
        session = await self.get_session(session_token)
        if not session:
            return False
            
        current_usage = session.get('memory_usage_bytes', 0)
        max_bytes = MAX_MEMORY_PER_SESSION_MB * 1024 * 1024
        
        return (current_usage + additional_bytes) <= max_bytes
    
    async def update_memory_usage(self, session_token: str, bytes_delta: int):
        """Update memory usage for a session."""
        await self.redis_client.hincrby(f"session:{session_token}", "memory_usage_bytes", bytes_delta)

class RedisStorage:
    """Redis-based storage for chats, messages, and screenshots."""
    
    def __init__(self):
        self.redis_client = get_redis_client()
        self.session_manager = RedisSessionManager()
    
    # Chat operations
    async def create_chat(self, session_token: str, chat_name: Optional[str] = None) -> Dict[str, Any]:
        """Create a new chat in a session."""
        session = await self.session_manager.get_session(session_token)
        if not session:
            raise ValueError("Invalid session")
        
        if session['chat_count'] >= MAX_CHATS_PER_SESSION:
            raise ValueError("Maximum chats per session exceeded")
        
        chat_id = str(uuid.uuid4())
        chat_data = {
            "id": chat_id,
            "name": chat_name or f"Chat {session['chat_count'] + 1}",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "message_count": 0,
            "latest_message_content": None,
            "latest_message_timestamp": None
        }
        
        # Store chat data
        chat_key = f"session:{session_token}:chat:{chat_id}"
        await self.redis_client.hset(
            chat_key,
            mapping={k: str(v) if v is not None else "" for k, v in chat_data.items()}
        )
        await self.redis_client.expire(chat_key, SESSION_EXPIRE_MINUTES * 60)
        
        # Update session chat count
        await self.redis_client.hincrby(f"session:{session_token}", "chat_count", 1)
        
        return chat_data
    
    async def get_chats(self, session_token: str) -> List[Dict[str, Any]]:
        """Get all chats for a session."""
        chat_keys = await self.redis_client.keys(f"session:{session_token}:chat:*")
        chats = []
        
        for chat_key in chat_keys:
            if not chat_key.endswith(':messages'):  # Skip message keys
                chat_data = await self.redis_client.hgetall(chat_key)
                if chat_data and 'created_at' in chat_data:  # Only include chats with created_at
                    chat_data['message_count'] = int(chat_data.get('message_count', 0))
                    chats.append(chat_data)
        
        # Sort by created_at descending
        chats.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        return chats
    
    async def get_chat(self, session_token: str, chat_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific chat."""
        chat_data = await self.redis_client.hgetall(f"session:{session_token}:chat:{chat_id}")
        if not chat_data:
            return None
        
        chat_data['message_count'] = int(chat_data.get('message_count', 0))
        return chat_data
    
    # Message operations
    async def add_message(self, session_token: str, chat_id: str, content: str, 
                         role: str = "user", metadata: Optional[Dict] = None, message_id: Optional[str] = None, timestamp: Optional[str] = None) -> Dict[str, Any]:
        """Add a message to a chat."""
        # Check memory limit
        message_size = len(content.encode('utf-8')) + (len(json.dumps(metadata)) if metadata else 0)
        if not await self.session_manager.check_memory_limit(session_token, message_size):
            raise ValueError("Session memory limit exceeded")
        
        # Check message count limit
        chat = await self.get_chat(session_token, chat_id)
        if not chat:
            raise ValueError("Chat not found")
        
        if chat['message_count'] >= MAX_MESSAGES_PER_CHAT:
            raise ValueError("Maximum messages per chat exceeded")
        
        # Use provided message_id or generate a new one
        if message_id is None:
            message_id = str(uuid.uuid4())
        
        # Use provided timestamp or generate current timestamp
        if timestamp is None:
            timestamp = datetime.now(timezone.utc).isoformat()
        
        message_data = {
            "id": message_id,
            "content": content,
            "role": role,
            "timestamp": timestamp,
            "metadata": json.dumps(metadata) if metadata else ""
        }
        
        # Store message
        message_key = f"session:{session_token}:chat:{chat_id}:message:{message_id}"
        await self.redis_client.hset(
            message_key,
            mapping=message_data
        )
        await self.redis_client.expire(message_key, SESSION_EXPIRE_MINUTES * 60)
        
        # Update chat metadata
        chat_key = f"session:{session_token}:chat:{chat_id}"
        await self.redis_client.hset(
            chat_key,
            mapping={
                "latest_message_content": content[:100] + "..." if len(content) > 100 else content,
                "latest_message_timestamp": timestamp,
                "updated_at": timestamp
            }
        )
        await self.redis_client.hincrby(chat_key, "message_count", 1)
        
        # Update session memory usage
        await self.session_manager.update_memory_usage(session_token, message_size)
        
        return {**message_data, "metadata": metadata}
    
    async def update_message(self, session_token: str, chat_id: str, message_id: str, 
                           content: str, metadata: Optional[Dict] = None, timestamp: Optional[str] = None) -> Dict[str, Any]:
        """Update an existing message in a chat."""
        # Check if message exists
        message_key = f"session:{session_token}:chat:{chat_id}:message:{message_id}"
        existing_message = await self.redis_client.hgetall(message_key)
        
        if not existing_message:
            raise ValueError(f"Message {message_id} not found")
        
        # Update the message data
        # Use provided timestamp or generate current timestamp for updates
        if timestamp is None:
            timestamp = datetime.now(timezone.utc).isoformat()
        
        updated_data = {
            "content": content,
            "metadata": json.dumps(metadata) if metadata else "",
            "timestamp": timestamp  # Use provided timestamp or current time
        }
        
        # Update in Redis
        await self.redis_client.hset(message_key, mapping=updated_data)
        await self.redis_client.expire(message_key, SESSION_EXPIRE_MINUTES * 60)
        
        # Update chat's latest message if this was the most recent
        chat_key = f"session:{session_token}:chat:{chat_id}"
        await self.redis_client.hset(
            chat_key,
            mapping={
                "latest_message_content": content[:100] + "..." if len(content) > 100 else content,
                "latest_message_timestamp": timestamp,
                "updated_at": timestamp
            }
        )
        
        # Return updated message
        updated_message = await self.redis_client.hgetall(message_key)
        updated_message['metadata'] = json.loads(updated_message['metadata']) if updated_message['metadata'] else {}
        return updated_message
    
    async def upsert_message(self, session_token: str, chat_id: str, content: str, 
                           role: str = "agent", metadata: Optional[Dict] = None, message_id: Optional[str] = None, timestamp: Optional[str] = None) -> Dict[str, Any]:
        """Update existing message or create new one if it doesn't exist."""
        # Use provided message_id or generate a new one
        if message_id is None:
            message_id = str(uuid.uuid4())
        
        # Check if message exists
        message_key = f"session:{session_token}:chat:{chat_id}:message:{message_id}"
        existing_message = await self.redis_client.hgetall(message_key)
        
        if existing_message:
            # Message exists - update it, always preserving the original timestamp
            existing_timestamp = existing_message.get('timestamp')
            
            return await self.update_message(session_token, chat_id, message_id, content, metadata, existing_timestamp)
        else:
            # Message doesn't exist - create it
            return await self.add_message(session_token, chat_id, content, role, metadata, message_id, timestamp)
    
    async def get_messages(self, session_token: str, chat_id: str, limit: int = 50, offset: int = 0) -> List[Dict[str, Any]]:
        """Get messages for a chat with pagination."""
        message_keys = await self.redis_client.keys(f"session:{session_token}:chat:{chat_id}:message:*")
        messages = []
        
        for message_key in message_keys:
            message_data = await self.redis_client.hgetall(message_key)
            if message_data:
                message_data['metadata'] = json.loads(message_data['metadata']) if message_data['metadata'] else {}
                messages.append(message_data)
        
        # Sort by timestamp descending (newest first for chat applications)
        messages.sort(key=lambda x: x['timestamp'], reverse=True)
        
        # Apply pagination
        return messages[offset:offset + limit]
    
    # Screenshot operations
    async def store_screenshot(self, session_token: str, chat_id: str, message_id: str, 
                             screenshot_data: bytes, content_type: str = "image/png") -> str:
        """Store a screenshot for a message."""
        screenshot_size = len(screenshot_data)
        if not await self.session_manager.check_memory_limit(session_token, screenshot_size):
            raise ValueError("Session memory limit exceeded")
        
        screenshot_id = str(uuid.uuid4())
        screenshot_key = f"session:{session_token}:screenshot:{screenshot_id}"
        
        screenshot_metadata = {
            "id": screenshot_id,
            "chat_id": chat_id,
            "message_id": message_id,
            "content_type": content_type,
            "size_bytes": screenshot_size,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Store screenshot data and metadata
        await self.redis_client.hset(screenshot_key, "data", screenshot_data)
        await self.redis_client.hset(screenshot_key, "metadata", json.dumps(screenshot_metadata))
        await self.redis_client.expire(screenshot_key, SESSION_EXPIRE_MINUTES * 60)
        
        # Update session memory usage
        await self.session_manager.update_memory_usage(session_token, screenshot_size)
        
        return screenshot_id
    
    async def get_screenshot(self, session_token: str, screenshot_id: str) -> Optional[Dict[str, Any]]:
        """Get a screenshot by ID."""
        screenshot_key = f"session:{session_token}:screenshot:{screenshot_id}"
        screenshot_raw = await self.redis_client.hgetall(screenshot_key)
        
        if not screenshot_raw:
            return None
        
        metadata = json.loads(screenshot_raw['metadata'])
        return {
            "data": screenshot_raw['data'],
            "metadata": metadata
        }
