from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from starlette.types import ASGIApp
from app.infrastructure.caching import get_redis_client

class RedisMiddleware(BaseHTTPMiddleware):
    """
    Attaches a Redis client instance (obtained from the pool via get_redis_client)
    to the request state (`request.state.redis`).
    """
    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next) -> Response:
        """
        Gets a Redis client, attaches it to request.state, and proceeds.
        Note: This gets a new client connection from the pool for each request.
        Consider performance implications if connection overhead is high.
        """
        redis_client = await get_redis_client()
        request.state.redis = redis_client
        try:
            response = await call_next(request)
        finally:
            pass
        return response 