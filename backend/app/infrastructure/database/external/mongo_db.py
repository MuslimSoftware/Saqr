import logging
from pymongo import MongoClient
from pymongo.errors import ConfigurationError, ConnectionFailure
from app.config.environment import environment

logger = logging.getLogger(__name__)

# --- External MongoDB Client Initialization (using pymongo) ---
external_mongo_client = None
external_mongo_db = None

def init_external_mongo_client():
    """Initialize the PyMongo client for the external MongoDB database."""
    global external_mongo_client, external_mongo_db
    if external_mongo_client is not None:
        logger.warning("External PyMongo client already initialized.")
        return external_mongo_client, external_mongo_db

    if not environment.EXTERNAL_MONGO_URI or not environment.EXTERNAL_MONGO_COLLECTION_NAME:
        logger.warning("External FH MongoDB URI or DB Name not configured. Skipping initialization.")
        return None, None

    try:
        external_mongo_client = MongoClient(environment.EXTERNAL_MONGO_URI, serverSelectionTimeoutMS=5000)
        # The ismaster command is cheap and does not require auth.
        external_mongo_client.admin.command('ismaster')
        external_mongo_db = external_mongo_client[environment.EXTERNAL_MONGO_COLLECTION_NAME]
        logger.info(f"External PyMongo client initialized for DB: {environment.EXTERNAL_MONGO_COLLECTION_NAME}")
    except ConfigurationError as e:
        logger.critical(f"Failed to initialize External PyMongo client (Configuration Error): {e}", exc_info=True)
        external_mongo_client = None
        external_mongo_db = None
    except ConnectionFailure as e:
        logger.critical(f"Failed to connect to External MongoDB server: {e}", exc_info=True)
        external_mongo_client = None
        external_mongo_db = None
    except Exception as e:
        logger.critical(f"An unexpected error occurred during External PyMongo client initialization: {e}", exc_info=True)
        external_mongo_client = None
        external_mongo_db = None
        
    return external_mongo_client, external_mongo_db

def close_external_mongo_client():
    """Closes the external MongoDB client."""
    global external_mongo_client
    if external_mongo_client is not None:
        external_mongo_client.close()
        logger.info("External MongoDB client closed successfully.")
        

def get_external_mongo_db():
    """Returns the initialized external MongoDB database object."""
    if external_mongo_db is None:
        logger.error("External MongoDB database requested but not initialized. Call init_external_mongo_client() during startup.")
    return external_mongo_db
