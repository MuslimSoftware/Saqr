from typing import Annotated
from fastapi import Depends

# --- Import Actual Classes --- #
# Models
from app.features.user.models import User
# Services
from app.features.user.services import UserService
from app.features.auth.services import AuthService, JWTService
from app.features.common.services import OTPService
from app.features.chat.services import ChatService
from app.features.chat.services.redis_chat_service import RedisChatService
from app.features.agent.services import AgentService
# Repositories
from app.features.user.repositories import UserRepository
from app.features.chat.repositories import ChatRepository, WebSocketRepository, ScreenshotRepository

# --- Import Provider Functions --- #
from .common import get_redis
from .repositories import (
    get_user_repository,
    get_chat_repository,
    get_websocket_repository,
    get_screenshot_repository,
)
from .services import (
    get_user_service,
    get_jwt_service,
    get_otp_service,
    get_auth_service,
    get_chat_service,
    get_redis_chat_service,
    get_agent_service,
)
from .auth import get_current_user, get_current_user_ws

# --- Define Annotated Dependency Types --- #
# Services
AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]
UserServiceDep = Annotated[UserService, Depends(get_user_service)]
JWTServiceDep = Annotated[JWTService, Depends(get_jwt_service)]
OTPServiceDep = Annotated[OTPService, Depends(get_otp_service)]
ChatServiceDep = Annotated[ChatService, Depends(get_chat_service)]
RedisChatServiceDep = Annotated[RedisChatService, Depends(get_redis_chat_service)]
AgentServiceDep = Annotated[AgentService, Depends(get_agent_service)]

# Repositories
UserRepositoryDep = Annotated[UserRepository, Depends(get_user_repository)]
ChatRepositoryDep = Annotated[ChatRepository, Depends(get_chat_repository)]
WebSocketRepositoryDep = Annotated[WebSocketRepository, Depends(get_websocket_repository)]
ScreenshotRepositoryDep = Annotated[ScreenshotRepository, Depends(get_screenshot_repository)]

# User Objects
UserDep = Annotated[User, Depends(get_current_user)]
CurrentUserWsDep = Annotated[User, Depends(get_current_user_ws)]


# --- Exports --- #
__all__ = [
    # Common Providers
    "get_redis",

    # Auth Providers (These ARE likely needed externally)
    "get_current_user",
    "get_current_user_ws",

    # Annotated Service Types (These ARE needed externally)
    "AuthServiceDep",
    "UserServiceDep",
    "JWTServiceDep",
    "OTPServiceDep",
    "ChatServiceDep",
    "RedisChatServiceDep",
    "AgentServiceDep",

    # Annotated Repository Types (These ARE needed externally)
    "UserRepositoryDep",
    "ChatRepositoryDep",
    "WebSocketRepositoryDep",
    "ScreenshotRepositoryDep",

    # Annotated User Types (These ARE needed externally)
    "UserDep",
    "CurrentUserWsDep",
] 