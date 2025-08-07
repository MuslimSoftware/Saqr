from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.middleware import SlowAPIMiddleware

# Assuming RedisMiddleware is defined here or imported from another file
from .redis_middleware import RedisMiddleware 
# Import settings for CORS configuration
from app.config.environment import environment
# Imports needed for exception handlers
from app.features.common.exceptions import AppException
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler

# Export handlers if they are defined here, otherwise remove this
from .exception_handlers import app_exception_handler, global_exception_handler 


def setup_middleware(app: FastAPI):
    """Adds all required middlewares to the FastAPI application."""

    # Add rate limiting middleware FIRST
    app.add_middleware(SlowAPIMiddleware)

    # Add Redis Middleware
    app.add_middleware(RedisMiddleware)

    # Configure CORS
    if not environment.PRODUCTION: # Use environment
        origins = ["*"] # Allow all origins for development
    else:
        # Replace with your specific frontend origin(s) in production
        origins = [environment.API_URL] # Example: Pull from settings

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    print("Middlewares configured.")


# --- Exception Handler Setup ---

def setup_exception_handlers(app: FastAPI):
    """Adds custom and global exception handlers to the FastAPI app."""
    # Handler for rate limiting
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # Handler for custom app exceptions
    app.add_exception_handler(AppException, app_exception_handler)

    # Handler for all other unhandled exceptions
    app.add_exception_handler(Exception, global_exception_handler)

    print("Exception handlers configured.")


# Ensure this __all__ reflects what should be importable via 'from app.middlewares import ...'
__all__ = [
    "setup_middleware",
    "setup_exception_handlers",
    "app_exception_handler", 
    "global_exception_handler",
    "RedisMiddleware"
]