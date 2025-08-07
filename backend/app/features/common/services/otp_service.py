import random
import string
from app.features.common.schemas import ServiceResult
from app.features.common.exceptions import AppException
import redis.asyncio as redis

class OTPService:
    """Service for handling OTP operations using Redis."""

    def __init__(self, redis_client: redis.Redis):
        """Initialize OTPService with a Redis client."""
        self._redis = redis_client
        self._otp_length = 6
        self._otp_expiry_seconds = 600  # 10 minutes
        self._redis_key_prefix = "otp:" # Prefix for Redis keys

    def _get_redis_key(self, email: str) -> str:
        """Generate the Redis key for a given email."""
        return f"{self._redis_key_prefix}{email}"

    async def request_otp(self, email: str) -> ServiceResult: # Made async
        """
        Generate and store a new OTP for the given email in Redis.

        Args:
            email: The email to generate OTP for

        Returns:
            ServiceResult with success status and expiry time
        """
        otp = self._generate_otp()
        await self._store_otp(email, otp) # Await Redis operation

        # TODO: Send OTP via email service
        # For development, print OTP to console
        print(f"OTP for {email} ({otp}) stored in Redis")

        return ServiceResult(
            success=True,
            message="Verification code sent",
            data={"expires_in": self._otp_expiry_seconds}
        )

    async def verify_otp(self, email: str, otp: str) -> ServiceResult: # Made async
        """
        Verify an OTP for the given email from Redis.
        Only deletes the OTP if verification is successful.

        Args:
            email: The email to verify OTP for
            otp: The OTP to verify

        Returns:
            ServiceResult with verification status
        """
        redis_key = self._get_redis_key(email)
        stored_otp = await self._redis.get(redis_key)

        if stored_otp is None:
            raise AppException(message="Verification code not found or expired", error_code="OTP_INVALID_OR_EXPIRED", status_code=400)

        if stored_otp == otp:
            await self._redis.delete(redis_key)
            return ServiceResult(
                success=True,
                message="Code verified successfully"
            )
        else:
            raise AppException(message="Invalid code", error_code="OTP_INVALID", status_code=400)

    def _generate_otp(self) -> str:
        """Generate a random OTP."""
        return ''.join(random.choices(string.digits, k=self._otp_length))

    async def _store_otp(self, email: str, otp: str) -> None: # Made async
        """Store OTP in Redis with expiry time."""
        redis_key = self._get_redis_key(email)
        await self._redis.set(redis_key, otp, ex=self._otp_expiry_seconds)

    # Removed _is_expired method as Redis handles TTL

    async def clear_otp(self, email: str) -> None: # Made async
        """Clear stored OTP for an email from Redis."""
        redis_key = self._get_redis_key(email)
        await self._redis.delete(redis_key) 