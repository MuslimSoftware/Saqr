from typing import Optional
import json
import uuid

from app.features.user.models import User
from app.features.common.exceptions import DatabaseException, DuplicateEntityException
from app.infrastructure.caching import get_redis_client
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserRepository:
    @staticmethod
    async def find_by_email(email: str) -> Optional[User]:
        """Find a user by email."""
        try:
            redis = get_redis_client()
            user_data = await redis.get(f"user:email:{email}")
            if user_data:
                return User(**json.loads(user_data))
            return None
        except Exception as e:
            raise DatabaseException(
                message=f"Database error finding user: {str(e)}",
                error_code="DB_USER_FIND_FAILED",
                status_code=500
            )
    
    @staticmethod
    async def create(email: str) -> Optional[User]:
        """Create a new user."""
        try:
            # Check if user already exists
            existing_user = await UserRepository.find_by_email(email)
            if existing_user:
                raise DuplicateEntityException(message="User already exists", error_code="USER_ALREADY_EXISTS", status_code=400)
            
            # Create new user
            user_id = str(uuid.uuid4())
            user = User(id=user_id, email=email)
            
            # Store in Redis
            redis = get_redis_client()
            await redis.set(f"user:email:{email}", user.json())
            await redis.set(f"user:id:{user_id}", user.json())
            
            return user
        except DuplicateEntityException as e:
            raise e
        except Exception as e:
            raise DatabaseException(
                message=f"Database error creating user: {str(e)}",
                error_code="DB_USER_CREATE_FAILED",
                status_code=500
            )
    