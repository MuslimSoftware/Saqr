import logging
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.pool import QueuePool
from app.config.environment import environment

logger = logging.getLogger(__name__)

# --- SQLAlchemy Engine Initialization ---
sql_engine = None

def init_sql_engine():
    """Initialize the SQLAlchemy engine and connection pool for MySQL."""
    global sql_engine # Allow modification of the global variable
    if sql_engine is not None:
        logger.warning("SQLAlchemy engine already initialized.")
        return sql_engine
        
    # Construct the database URL from settings
    # Ensure correct format: mysql+pymysql://user:password@host:port/database
    DATABASE_URL = "mysql+pymysql://root:rootpass@sakila-mysql:3306/sakila"
    
    try:
        # Create the SQLAlchemy engine
        sql_engine = create_engine(
            DATABASE_URL,
            poolclass=QueuePool,
            pool_size=5,
            max_overflow=10,
            pool_timeout=30,
            pool_recycle=1800,
            echo=True
        )
        logger.info(f"SQLAlchemy engine created successfully for sakila-mysql:3306/sakila")
        
        # Optional: Test connection on startup (can be noisy)
        # with sql_engine.connect() as connection:
        #    logger.info("SQLAlchemy engine connected successfully on startup.")
            
    except SQLAlchemyError as e:
        logger.critical(f"Failed to create SQLAlchemy engine: {e}", exc_info=True)
        sql_engine = None # Ensure engine is None if creation failed
    except Exception as e:
        logger.critical(f"An unexpected error occurred during SQLAlchemy engine creation: {e}", exc_info=True)
        sql_engine = None
        
    return sql_engine

def close_sql_engine():
    """Close the SQLAlchemy engine."""
    global sql_engine
    if sql_engine:
        sql_engine.dispose()
        sql_engine = None

def get_sql_engine():
    """Returns the initialized SQLAlchemy engine. Initializes if not already done."""
    # Simple getter, assumes init_sql_engine is called during app startup
    if sql_engine is None:
        logger.error("SQLAlchemy engine requested but not initialized. Call init_sql_engine() during startup.")
        # Depending on requirements, could attempt initialization here, but better at startup
        # init_sql_engine()
        # if sql_engine is None:
        #    raise RuntimeError("SQLAlchemy engine failed to initialize.")
    return sql_engine
