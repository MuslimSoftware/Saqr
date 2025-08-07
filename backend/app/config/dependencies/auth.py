from fastapi import Depends, HTTPException, status, WebSocket, WebSocketException, Query
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from pydantic import ValidationError
from typing import TYPE_CHECKING
from beanie import PydanticObjectId
import uuid

from app.features.user.models import User
from app.features.common.exceptions import AppException
from app.infrastructure.caching.redis import RedisSessionManager

if TYPE_CHECKING:
    from .types import AuthServiceDep
from .services import get_auth_service


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

async def get_current_user( 
    token: str = Depends(oauth2_scheme), 
    auth_service: 'AuthServiceDep' = Depends(get_auth_service)
) -> User:
    """Dependency to get current user from JWT token in HTTP Authorization header."""
    try:
        # Verify the access token
        result = auth_service.jwt_service.verify_token(token, {"type": "access"})
        session_token = result.data.get("email")  # This is actually the session token
        
        if session_token and session_token.startswith("demo-session-"):
            # This is a demo session token
            session_manager = RedisSessionManager()
            session = await session_manager.get_session(session_token)
            
            if not session:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Session expired or invalid",
                    headers={"WWW-Authenticate": "Bearer"}
                )
            # Create a temporary User object for demo session
            # We can't use the session token as ID directly since User expects PydanticObjectId
            # Instead, we'll create a proper User object and store session token separately
            demo_user = User(
                email="demo@example.com",  # Use a valid email domain
                is_active=True
            )
            
            # Generate a proper PydanticObjectId for the user
            demo_user.id = PydanticObjectId()
            
            # Store session token as a custom attribute for later use
            demo_user._session_token = session_token
            return demo_user
        
        # For regular users, use the existing logic
        user = await auth_service._get_user_from_token(token=token)
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Invalid authentication credentials", 
                headers={"WWW-Authenticate": "Bearer"}
            )
        return user
    except AppException as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validation failed: {e.message}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except (JWTError, ValidationError) as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Could not validate credentials: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

# --- WebSocket Authentication Dependency --- 
async def get_current_user_ws(
    websocket: WebSocket,
    token: str | None = Query(None), # Extract token from query param
    auth_service: 'AuthServiceDep' = Depends(get_auth_service)
) -> User:
    """Dependency to get current user for WebSocket connection using token from query param."""
    if token is None:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Missing token")
    
    try:
        # Verify the access token
        result = auth_service.jwt_service.verify_token(token, {"type": "access"})
        session_token = result.data.get("email")  # This is actually the session token
        
        if session_token and session_token.startswith("demo-session-"):
            # This is a demo session token
            session_manager = RedisSessionManager()
            session = await session_manager.get_session(session_token)
            
            if not session:
                raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Session expired")
            
            # Create a temporary User object for demo session
            demo_user = User(
                email="demo@example.com",  # Use a valid email domain
                is_active=True
            )
            # Generate a proper PydanticObjectId for the user
            demo_user.id = PydanticObjectId()
            # Store session token as a custom attribute for later use
            demo_user._session_token = session_token
            return demo_user
        
        # For regular users, use the existing logic
        user = await auth_service._get_user_from_token(token=token)
        if not user or not user.is_active:
            raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason="Authentication failed")
        return user
    except AppException as e:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason=f"Token validation failed: {e.message}")
    except (JWTError, ValidationError) as e:
        raise WebSocketException(code=status.WS_1008_POLICY_VIOLATION, reason=f"Authentication failed: {str(e)}")
# --- End WebSocket Authentication Dependency --- 