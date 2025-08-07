import redis.asyncio as redis
from app.infrastructure.caching.redis import get_redis_client

async def get_redis() -> redis.Redis:
    return await get_redis_client() 