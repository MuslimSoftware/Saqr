from typing import Annotated
from fastapi import Depends
from app.infrastructure.caching.redis import get_redis_client

# --- Import Actual Classes needed for type hints & construction --- #
from app.features.user.services import UserService
from app.features.auth.services import AuthService, JWTService
from app.features.common.services import OTPService
from app.features.chat.services import ChatService
from app.features.chat.services.redis_chat_service import RedisChatService
from app.features.agent.services import AgentService
from app.features.user.repositories import UserRepository
from app.features.chat.repositories import ChatRepository, WebSocketRepository

# --- Import Provider Functions for Dependencies --- #
from .repositories import (
    get_user_repository,
    get_chat_repository,
    get_websocket_repository,
)
# Need to define service providers before they are used in Depends()
# This requires careful ordering or potentially moving providers
# that depend on other services to the bottom or a different structure.

# --- Service Provider Functions --- #

# Providers with NO service dependencies
def get_jwt_service() -> JWTService:
    return JWTService()

async def get_otp_service() -> OTPService:
    redis_client = await get_redis_client()
    return OTPService(redis_client=redis_client)

def get_user_service(
    user_repository: Annotated[UserRepository, Depends(get_user_repository)]
) -> UserService:
    return UserService(user_repository=user_repository)

# Providers that depend on repositories AND potentially other services
# Define dependent services first if possible

def get_auth_service(
    user_repository: Annotated[UserRepository, Depends(get_user_repository)],
    jwt_service: Annotated[JWTService, Depends(get_jwt_service)],
    otp_service: Annotated[OTPService, Depends(get_otp_service)]
) -> AuthService:
    return AuthService(user_repository, jwt_service, otp_service)

def get_chat_service(
    chat_repo: Annotated[ChatRepository, Depends(get_chat_repository)],
    websocket_repository: Annotated[WebSocketRepository, Depends(get_websocket_repository)]
) -> ChatService:
    return ChatService(
        chat_repository=chat_repo,
        websocket_repository=websocket_repository
    )

def get_redis_chat_service() -> RedisChatService:
    """Provider for Redis-based chat service used in demo mode."""
    return RedisChatService()

def get_agent_service(
    chat_service: Annotated[ChatService, Depends(get_chat_service)]
) -> AgentService:
    return AgentService(
        chat_service=chat_service
    )
