
from app.features.user.repositories import UserRepository
from app.features.common.schemas import ServiceResult

class UserService:
    def __init__(self, user_repository: UserRepository):
        self.user_repository = user_repository
    
    async def get_user(self, email: str) -> ServiceResult:
        user = await self.user_repository.find_by_email(email)
        return ServiceResult(
            success=user is not None,
            message="User found successfully" if user else "User not found",
            data=user.model_dump() if user else None
        )
