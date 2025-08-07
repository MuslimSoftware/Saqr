import logging
from motor.motor_asyncio import AsyncIOMotorClient
from beanie import init_beanie

# TODO: Check if these model imports are still correct relative to this new path
from app.features.user.models import User 
from app.features.chat.models import Chat, Screenshot, ChatEvent

# TODO: Adjust the settings import path if needed
from app.config.environment import environment

logger = logging.getLogger(__name__)

# --- MongoDB / Beanie Initialization ---
async def init_db():
    """Initialize MongoDB database connection using Beanie."""
    # Create Motor client
    client = AsyncIOMotorClient(environment.MONGODB_URL)
    
    # Initialize beanie with the MongoDB client and document models
    await init_beanie(
        database=client[environment.MONGODB_DB_NAME],
        document_models=[User, Chat, Screenshot, ChatEvent]
    )
    logger.info(f"Beanie initialized with MongoDB: {environment.MONGODB_DB_NAME}")
    # Returning the client might be useful if needed elsewhere, though often not required after init
    return client
