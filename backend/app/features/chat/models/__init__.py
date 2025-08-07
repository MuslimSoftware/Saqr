from .chat_model import Chat
from .screenshot_model import Screenshot
from .chat_event_model import ChatEvent

# Rebuild models after both are imported to resolve forward references
Chat.model_rebuild()
Screenshot.model_rebuild()
ChatEvent.model_rebuild()

# Also rebuild user model if it might have forward refs
from app.features.user.models import User
User.model_rebuild()

__all__ = [
    "Chat",
    "Screenshot",
    "ChatEvent"
] 