from datetime import datetime, timedelta, timezone
from typing import Optional, Dict
from jose import jwt, JWTError
from app.config.environment import environment
from app.features.common.schemas import ServiceResult
from app.features.common.exceptions import AppException
from app.features.auth.schemas.auth_schemas import TokenData

class TokenType:
    """Token types for different stages of authentication."""
    # Permanent tokens
    ACCESS = "access"
    REFRESH = "refresh"

    # Used for auth flow
    AUTH = "auth"

class JWTService:
    """Service for handling JWT tokens and authentication flows."""

    def __init__(self):
        self.secret_key = environment.JWT_SECRET_KEY
        self.algorithm = environment.JWT_ALGORITHM
        
        # Token expiration times
        self.access_token_expire_minutes = environment.JWT_ACCESS_TOKEN_EXPIRE_MINUTES
        self.refresh_token_expire_days = environment.JWT_REFRESH_TOKEN_EXPIRE_DAYS
        self.temp_token_expire_minutes = 60  # Temporary tokens expire in 60 minutes

    def _create_token(
        self,
        email: str,
        token_type: str,
        expires_delta: timedelta,
        additional_data: Optional[Dict] = None
    ) -> str:
        """
        Create a JWT token with standard claims and optional additional data.
        
        Args:
            subject: The subject (usually user email)
            token_type: Type of token (access, refresh, temp)
            expires_delta: Token expiration time
            additional_data: Additional claims to include
            
        Returns:
            Encoded JWT token
        """
        expires_at = datetime.now(timezone.utc) + expires_delta
        
        to_encode = {
            "email": email,
            "type": token_type,
            "iat": datetime.now(timezone.utc),
            "exp": expires_at
        }
        
        if additional_data:
            to_encode.update(additional_data)
            
        return jwt.encode(to_encode, self.secret_key, algorithm=self.algorithm)

    def create_tokens(self, email: str) -> Dict[str, str]:
        """
        Create both access and refresh tokens for a user.
        Used after successful login/signup.
        
        Args:
            subject: User identifier (usually email)
            
        Returns:
            Dict containing access and refresh tokens with their expiry
        """
        access_token = self._create_token(
            email=email,
            token_type=TokenType.ACCESS,
            expires_delta=timedelta(minutes=self.access_token_expire_minutes)
        )
        
        refresh_token = self._create_token(
            email=email,
            token_type=TokenType.REFRESH,
            expires_delta=timedelta(days=self.refresh_token_expire_days)
        )
        
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer",
            "expires_in": self.access_token_expire_minutes * 60  # in seconds
        }

    def create_auth_flow_token(
        self,
        email: str,
        additional_data: Optional[Dict] = None
    ) -> str:
        """
        Create a temporary token for intermediate authentication steps.
        """
        return self._create_token(
            email=email,
            token_type=TokenType.AUTH,
            expires_delta=timedelta(minutes=self.temp_token_expire_minutes),
            additional_data=additional_data
        )

    def verify_token(
        self,
        token: str,
        data: Optional[Dict] = None
    ) -> ServiceResult:
        """
        Verify and decode a JWT token.
        """
        try:
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm]
            )
            
            # Check if all required data is present and matches
            if data:
                for key in data.keys():
                    if key not in payload:
                        raise AppException(message="Token is missing required data", error_code="TOKEN_MISSING_DATA", status_code=400)
                    if payload.get(key) != data.get(key):
                        raise AppException(message="Token data does not match required data", error_code="TOKEN_DATA_MISMATCH", status_code=400)
            
            return ServiceResult(
                success=True,
                message="Token verified successfully",
                data=payload
            )
        except JWTError as e:
            raise AppException(message=f"Invalid or expired token: {str(e)}", error_code="TOKEN_INVALID", status_code=400)

    def refresh_access_token(self, refresh_token: str) -> Dict[str, str]:
        """
        Create a new access token using a refresh token.
        
        Args:
            refresh_token: Valid refresh token
            
        Returns:
            Dict with new access token and expiry
            
        Raises:
            HTTPException: If refresh token is invalid
        """
        result = self.verify_token(refresh_token, {"type": TokenType.REFRESH})
        
        access_token = self._create_token(
            email=result.data["email"],
            token_type=TokenType.ACCESS,
            expires_delta=timedelta(minutes=self.access_token_expire_minutes)
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": self.access_token_expire_minutes * 60
        }