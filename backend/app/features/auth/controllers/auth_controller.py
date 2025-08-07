from fastapi import APIRouter, HTTPException, status
from starlette.requests import Request
import uuid
from app.features.user.models import User
from app.infrastructure.security.rate_limit import limiter
from app.infrastructure.caching.redis import RedisSessionManager
from app.features.auth.schemas import (
    CheckEmailRequest,
    CheckEmailResponse,
    RequestOTPRequest,
    RequestOTPResponse,
    ValidateOTPRequest,
    ValidateOTPResponse,
    AuthRequest,
    AuthResponse,
    RefreshTokenRequest,
    RefreshTokenResponse
)
from app.features.common.schemas import ServiceResult
from app.config.dependencies import AuthServiceDep

prefix = "/auth"
tags = ["Authentication"]

router = APIRouter(
    prefix=prefix,
    tags=tags
)

@router.post("/check-email", response_model=CheckEmailResponse)
async def check_email_availability(
    request: CheckEmailRequest,
    auth_service: AuthServiceDep
) -> CheckEmailResponse:
    """Check if email exists and get verification token."""
    # Demo mode: always return that the email does not exist
    return CheckEmailResponse(
        success=True,
        message="Email is available.",
        data={"exists": False}
    )

@router.post("/request-otp", response_model=RequestOTPResponse)
@limiter.limit("5/minute")
async def request_otp(
    body: RequestOTPRequest,
    auth_service: AuthServiceDep,
    request: Request
) -> RequestOTPResponse:
    """Request OTP using verification token - Demo mode creates new session."""
    # Create a new session for each request
    session_manager = RedisSessionManager()
    session_token = session_manager.generate_session_token()
    
    # Create session in Redis
    await session_manager.create_session(session_token)
    
    # Create an auth flow token with the session token
    completion_token = auth_service.jwt_service.create_auth_flow_token(
        session_token, 
        additional_data={"session_type": "demo"}
    )
    
    return RequestOTPResponse(
        success=True,
        message="Demo session created successfully.",
        data={"expires_in": 1800, "token": completion_token}  # 30 minutes
    )

@router.post("/validate-otp", response_model=ValidateOTPResponse)
@limiter.limit("5/minute")
async def validate_otp(
    body: ValidateOTPRequest,
    auth_service: AuthServiceDep,
    request: Request
) -> ValidateOTPResponse:
    """Validate OTP and get completion token."""
    # Demo mode: This endpoint will not be used, but we keep it for compatibility
    # The token is now returned directly from /request-otp
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="This endpoint is not used in demo mode."
    )

@router.post("/auth", response_model=AuthResponse)
async def auth(
    request: AuthRequest,
    auth_service: AuthServiceDep
) -> AuthResponse:
    """Verify token and create session-based authentication"""
    try:
        # Verify the auth flow token
        verify_result = auth_service.jwt_service.verify_token(request.token, {"type": "auth"})
        session_token = verify_result.data["email"]  # This is actually the session token
        
        if verify_result.data.get("session_type") == "demo":
            # Verify session exists in Redis
            session_manager = RedisSessionManager()
            session = await session_manager.get_session(session_token)
            
            if not session:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Session expired or invalid"
                )
            
            # Create access tokens using the session token as identifier
            tokens = auth_service.jwt_service.create_tokens(session_token)
            return AuthResponse(
                success=True,
                message="Demo session authenticated successfully",
                data={
                    "access_token": tokens["access_token"],
                    "refresh_token": tokens["refresh_token"],
                }
            )
    except HTTPException:
        raise  # Re-raise HTTPExceptions as-is
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}"
        )
    
    # Fallback - should not reach here in demo mode
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Authentication failed - no demo session found"
    )

@router.post("/refresh", response_model=RefreshTokenResponse)
async def refresh_token(
    request: RefreshTokenRequest,
    auth_service: AuthServiceDep
) -> RefreshTokenResponse:
    """Refresh access token using refresh token."""
    result: ServiceResult = await auth_service.refresh_token(request.refresh_token)

    # Return appropriate status code based on result
    if not result.success:
        # Return 401 for expired/invalid refresh tokens
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=result.message
        )

    return RefreshTokenResponse(
        success=result.success,
        message=result.message,
        data={"access_token": result.data["access_token"]}
    )