from pydantic import BaseModel, EmailStr
from typing import Optional
from app.features.common.schemas.common_schemas import BaseResponse

# Email verification
class CheckEmailRequest(BaseModel):
    """First step in both login and signup flows.
    Used to check if an email is already registered, determining whether to proceed
    with login or signup flow."""
    email: EmailStr

class CheckEmailResponse(BaseResponse):
    """Response for email existence check.
    Informs frontend whether to proceed with login (exists=true) or
    signup (exists=false) flow."""


# OTP request
class RequestOTPRequest(BaseModel):
    """Request OTP using token from credential verification."""
    email: EmailStr

class RequestOTPResponse(BaseResponse):
    """Response after OTP is sent.
    Includes expiration time for the OTP and confirmation of delivery."""

# OTP validation
class ValidateOTPRequest(BaseModel):
    """Third step in authentication flow.
    Validates the OTP entered by the user."""
    email: EmailStr
    otp: str

class ValidateOTPResponse(BaseResponse):
    """Response after OTP validation.
    If valid=true, provides token for final login/signup step."""
    token: Optional[str] = None  # Token for completing auth

# Auth Completion (login or signup)
class AuthRequest(BaseModel):
    """Final step in authentication flow.
    Verifies token and either logs in or signs up."""
    token: str

class AuthResponse(BaseResponse):
    """Response after authentication completion.
    Provides access/refresh tokens and user ID."""
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None

# Refresh token
class RefreshTokenRequest(BaseModel):
    """Request to refresh access token using refresh token."""
    refresh_token: str

class RefreshTokenResponse(BaseResponse):
    """Response after token refresh.
    Provides new access token."""

# Internal schema for decoded token payload
class TokenData(BaseModel):
    """Schema representing the payload of a verified JWT token."""
    email: EmailStr
    type: str
