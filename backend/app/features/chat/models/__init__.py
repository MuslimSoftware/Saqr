from .chat_model import Chat

# Rebuild models after import to resolve forward references
Chat.model_rebuild()

# Also rebuild user model if it might have forward refs
from app.features.user.models import User
User.model_rebuild()

__all__ = [
    "Chat"
] 