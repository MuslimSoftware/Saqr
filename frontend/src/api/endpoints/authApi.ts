import { apiClient } from '@/api/client'
import { ApiResponse } from '@/api/types/api.types'
import { 
  RequestOTPResponse, 
  ValidateOTPResponse, 
  AuthResponse,
  OTPRequest,
  ValidateOTPRequest,
  AuthRequest,
  RefreshTokenRequest
} from '@/api/types/auth.types'

export const requestOTP = async ({email, signal}: OTPRequest): Promise<ApiResponse<RequestOTPResponse>> => {
  return apiClient.post('/auth/request-otp', { email }, { signal })
}

export const validateOTP = async ({email, otp, signal}: ValidateOTPRequest): Promise<ApiResponse<ValidateOTPResponse>> => {
  return apiClient.post('/auth/validate-otp', { email, otp }, { signal })
}

export const authenticate = async ({token, signal}: AuthRequest): Promise<ApiResponse<AuthResponse>> => {
  return apiClient.post('/auth/auth', { token }, { signal })
}

export const refreshToken = async ({refreshToken, signal}: RefreshTokenRequest): Promise<ApiResponse<{ access_token: string }>> => {
  return apiClient.post('/auth/refresh', { refresh_token: refreshToken }, { signal })
}