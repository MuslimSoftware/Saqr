from app.features.auth.services.jwt_service import JWTService, TokenType
from app.features.common.services import OTPService
from passlib.context import CryptContext
from app.features.common.schemas import ServiceResult
from app.features.user.repositories import UserRepository
from app.features.common.exceptions import AppException
from app.features.user.models import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService:
    def __init__(
        self,
        user_repository: UserRepository,
        jwt_service: JWTService,
        otp_service: OTPService
    ):
        self.user_repository = user_repository
        self.jwt_service = jwt_service
        self.otp_service = otp_service

    async def check_email_availability(self, email: str) -> ServiceResult:
        """Check if user with email exists."""
        exists = await self.user_repository.find_by_email(email) is not None
        return ServiceResult(
            success=True,
            message="User with this email already exists" if exists else "Email is available for use",
            data={"exists": exists}
        )
    
    async def request_otp(self, email: str) -> ServiceResult:
        """Request OTP based on the verification token type."""
        result = await self.otp_service.request_otp(email)

        if not result.success:
            raise AppException(message=result.message, error_code="OTP_REQUEST_FAILED", status_code=400)
        
        return ServiceResult(
            success=True,
            message=result.message,
            data={"expires_in": result.data["expires_in"]}
        )
    
    async def validate_otp(
        self,
        email: str,
        otp: str
    ) -> ServiceResult:
        """Validate OTP and return completion token."""
        # Verify the OTP
        result = await self.otp_service.verify_otp(email, otp)
        token = self.jwt_service.create_auth_flow_token(email)

        return ServiceResult(
            success=True,
            message=result.message,
            data={"token": token}
        )
    
    async def authenticate_with_token(self, token: str) -> ServiceResult:
        verify_result: ServiceResult = self.jwt_service.verify_token(token, data={"type": TokenType.AUTH})        
        email: str = verify_result.data["email"]
        user = await self.user_repository.find_by_email(email)
        
        # Handle authentication based on existence
        if user:
            message = "User logged in successfully"
        else:
            message = "User created successfully"
            user = await self.user_repository.create(email)
        
        if not user:
            raise AppException(message="Failed to access user account", error_code="USER_ACCESS_FAILED", status_code=400)
        
        # Create tokens once
        tokens = self.jwt_service.create_tokens(user.email)
        return ServiceResult(success=True, message=message, data=tokens)    
    
    async def refresh_token(self, refresh_token: str) -> ServiceResult:
        """Refresh access token using refresh token."""
        try:
            result = self.jwt_service.refresh_access_token(refresh_token)
            return ServiceResult(success=True, message="Token refreshed successfully", data=result)
        except AppException as e:
            # This handles expired/invalid refresh tokens
            return ServiceResult(success=False, message=e.message, data={})
    
    async def _get_user_from_token(self, token: str) -> User | None:
        try:
            verify_result: ServiceResult = self.jwt_service.verify_token(token, data={"type": TokenType.ACCESS})
            if not verify_result.success or "email" not in verify_result.data:
                return None # Token invalid or email missing

            email: str = verify_result.data["email"]
            user = await self.user_repository.find_by_email(email)
            return user
        except Exception: # Catch broad exceptions during token validation/DB lookup
            # Log the exception details here
            return None
