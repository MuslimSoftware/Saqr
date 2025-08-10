import logging
from contextlib import asynccontextmanager
from sqlalchemy import create_engine, text
from sqlalchemy.pool import QueuePool
from app.config.environment import environment

logger = logging.getLogger(__name__)

# Global engine instance
_engine = None

def init_sql_engine():
    """Initialize the SQL engine."""
    global _engine
    
    if _engine is not None:
        return _engine
    
    # Build MySQL connection URL
    db_url = (
        f"mysql+pymysql://"
        f"{environment.EXTERNAL_SQL_DB_USER}:{environment.EXTERNAL_SQL_DB_PASSWORD}"
        f"@{environment.EXTERNAL_SQL_DB_HOST}:{environment.EXTERNAL_SQL_DB_PORT}"
        f"/{environment.EXTERNAL_SQL_DB_NAME}"
    )
    
    try:
        _engine = create_engine(
            db_url,
            poolclass=QueuePool,
            pool_size=environment.EXTERNAL_SQL_DB_POOL_SIZE,
            max_overflow=environment.EXTERNAL_SQL_DB_MAX_OVERFLOW,
            echo=environment.EXTERNAL_SQL_DB_ECHO,
            # Connection arguments
            connect_args={
                "connect_timeout": 10,
                "read_timeout": 30,
                "write_timeout": 30,
            }
        )
        
        # Test the connection (SQLAlchemy 2.0 compatible)
        with _engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            
        logger.info(f"SQL engine initialized successfully for {environment.EXTERNAL_SQL_DB_HOST}")
        return _engine
        
    except Exception as e:
        logger.error(f"Failed to initialize SQL engine: {e}")
        raise

def get_sql_engine():
    """Get the SQL engine instance."""
    global _engine
    if _engine is None:
        _engine = init_sql_engine()
    return _engine

def close_sql_engine():
    """Close the SQL engine."""
    global _engine
    if _engine is not None:
        _engine.dispose()
        _engine = None
        logger.info("SQL engine closed")