from typing import TYPE_CHECKING
import logging
# from app.features.agent.graph import agentGraph

import json
from app.features.agent.dspy.agent import prompt
from app.features.chat.models.chat_event_model import ToolStatus

if TYPE_CHECKING:
    from app.config.dependencies import ChatServiceDep
    from app.features.chat.models import Chat

logger = logging.getLogger(__name__)

class AgentService:
    """Service layer for managing and interacting with different agents, handles broadcasting."""

    def __init__(
        self,
        chat_service: "ChatServiceDep",
    ):
        self.chat_service = chat_service
        logger.info(f"AgentService initialized.")

    async def process_user_message(
        self,
        chat: "Chat",
        user_content: str
    ) -> None:
        logger.info(f"AgentService: Processing user message for chat {chat.id}")

        try:
            await prompt(user_content, chat_service=self.chat_service, chat=chat)
        except Exception as e:
            logger.error(f"AgentService: Error processing user message: {e}")
            print(f"AgentService: Error processing user message: {e}")
            await self.chat_service.send_error_message(
                chat=chat,
                content=str(e)
            )