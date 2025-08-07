from fastapi import Request
from fastapi.responses import JSONResponse
from app.features.common.exceptions import AppException
from app.features.common.schemas import ErrorResponse
import logging

# Configure logging
logger = logging.getLogger(__name__)

async def app_exception_handler(request: Request, exc: AppException):
    # Log with stack trace at ERROR level for custom app exceptions
    logger.exception(f"App exception occurred: {exc.message} (Code: {exc.error_code})")
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            message=exc.message,
            error_code=exc.error_code,
            status_code=exc.status_code
        ).model_dump()
    )

async def global_exception_handler(request: Request, exc: Exception):
    # Log at CRITICAL level with stack trace for unhandled exceptions
    logger.critical(
        f"UNHANDLED EXCEPTION for {request.method} {request.url}",
        exc_info=True  # Includes stack trace like logger.exception()
    )
    return JSONResponse(
        status_code=500,
        content=ErrorResponse(
            message="An unexpected error occurred",
            error_code="INTERNAL_SERVER_ERROR",
            status_code=500
        ).model_dump()
    )