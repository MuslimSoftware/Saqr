from typing import Annotated
from fastapi import Depends
from app.features.user.repositories import UserRepository
from app.features.chat.repositories import ChatRepository, WebSocketRepository, ScreenshotRepository
from app.features.chat.repositories.chat_event_repository import ChatEventRepository

def get_user_repository() -> UserRepository:
    return UserRepository()

def get_chat_repository() -> ChatRepository:
    return ChatRepository()

def get_screenshot_repository() -> ScreenshotRepository:
    return ScreenshotRepository()

def get_websocket_repository() -> WebSocketRepository:
    return WebSocketRepository()

def get_chat_event_repository() -> ChatEventRepository:
    return ChatEventRepository()