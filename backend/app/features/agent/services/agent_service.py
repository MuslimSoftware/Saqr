from typing import TYPE_CHECKING
import logging
# from app.features.agent.graph import agentGraph

import json
from app.features.agent.dspy.agent import prompt

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
        user_content: str,
        session_token: str = None
    ) -> None:
        logger.info(f"AgentService: Processing user message for chat {chat.id}")

        try:
            # Set session context for Redis storage
            if session_token:
                self.chat_service.set_session_context(session_token)
                
            await prompt(user_content, chat_service=self.chat_service, chat=chat, session_token=session_token)
            
            # After successful message processing, try to generate chat title if needed
            await self._try_generate_title(chat)
        except Exception as e:
            logger.error(f"AgentService: Error processing user message: {e}")
            print(f"AgentService: Error processing user message: {e}")
            
            # No need to complete reasoning - let the error appear naturally
            
            # Format user-friendly error message
            error_message = self._format_error_message(e)
            print(f"[DEBUG] Sending formatted error message: {error_message[:100]}...")
            
            # Send error message immediately via WebSocket
            await self.chat_service.send_error_message(
                chat=chat,
                content=error_message
            )
            print(f"[DEBUG] Error message sent successfully")
    
    def _format_error_message(self, error: Exception) -> str:
        """Format different types of errors into user-friendly messages."""
        error_str = str(error).lower()
        
        # Handle API quota/rate limit errors
        if ("rate limit" in error_str or "quota" in error_str or "resource_exhausted" in error_str or 
            "429" in error_str or "quotafailure" in error_str):
            return ("🚫 **Rate Limit Exceeded**\n\n"
                   "I'm being rate limited by the OpenAI API. Please wait a moment and try again.\n\n"
                   "This usually resolves itself in a few minutes.")
        
        # Handle authentication errors
        if "authentication" in error_str or "api key" in error_str or "unauthorized" in error_str:
            return ("🔐 **Authentication Error**\n\n"
                   "There's an issue with the API credentials. Please check that the API key is properly configured.\n\n"
                   "If you're the developer, verify your environment variables are set correctly.")
        
        # Handle network/connection errors
        if any(term in error_str for term in ["connection", "network", "timeout", "unreachable"]):
            return ("🌐 **Connection Error**\n\n"
                   "I'm having trouble connecting to the AI service. This could be a temporary network issue.\n\n"
                   "**Please try:**\n"
                   "• Checking your internet connection\n"
                   "• Waiting a moment and trying again\n"
                   "• Refreshing the page if the issue persists")
        
        # Handle parsing/format errors
        if any(term in error_str for term in ["parsing", "format", "json", "syntax"]):
            return ("⚙️ **Processing Error**\n\n"
                   "I encountered an issue while processing the response. This is usually temporary.\n\n"
                   "Please try rephrasing your question or try again in a moment.")
        
        # Handle general service errors
        if any(term in error_str for term in ["service", "server", "internal"]):
            return ("🔧 **Service Error**\n\n"
                   "The AI service is experiencing technical difficulties. This is usually temporary.\n\n"
                   "Please try again in a few minutes. If the issue persists, the service may be under maintenance.")
        
        # Fallback for unknown errors - provide a helpful generic message
        return ("❌ **Unexpected Error**\n\n"
               "I encountered an unexpected issue while processing your request.\n\n"
               "**Please try:**\n"
               "• Rephrasing your question\n"
               "• Trying again in a moment\n"
               "• Refreshing the page if issues continue\n\n"
               f"**Technical details:** {str(error)[:200]}{'...' if len(str(error)) > 200 else ''}")

    async def _try_generate_title(self, chat: "Chat") -> None:
        """Try to generate a title for the chat if appropriate."""
        try:
            # Check if chat already has a meaningful title (not the default "New Chat")
            if hasattr(chat, 'name') and chat.name and chat.name != "New Chat":
                return
            
            # Try to generate title using chat service
            generated_title = await self.chat_service._generate_chat_title(chat)
            
            if generated_title:
                # Broadcast the title update
                await self.chat_service.send_chat_title_update(chat, generated_title)
                
        except Exception as e:
            # Don't fail the main process if title generation fails
            pass