import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useLocalSearchParams } from 'expo-router'
import { useApi } from '@/api/useApi'
import { useAuth } from '@/features/auth/context/AuthContext'
import { validateOTP, authenticate } from '@/api/endpoints/authApi'
import { useRequestOTP } from './useRequestOTP'
import {
  ValidateOTPResponse,
  AuthResponse,
  ValidateOTPRequest,
  AuthRequest
} from '@/api/types/auth.types'

const COOLDOWN_DURATION = 30 // seconds

export function useOTPVerification() {
  // State
  const [otp, setOtp] = useState('')
  const [resendCooldown, setResendCooldown] = useState(COOLDOWN_DURATION)
  const [internalError, setInternalError] = useState<string | null>(null); // New state for non-API errors
  
  // Hooks
  const { signIn } = useAuth()
  const { email } = useLocalSearchParams<{ email?: string }>()

  // --- Use the centralized hook for OTP requests --- 
  const { 
    sendOTP: sendOtpRequest, // Rename to avoid conflict 
    loading: requestOtpLoading,
    error: requestOtpError,
    reset: resetRequestOtpError
  } = useRequestOTP();

  // --- Hooks for Validation and Auth --- 
  const validateOTPApi = useApi<
    ValidateOTPResponse,
    [ValidateOTPRequest]
  >(validateOTP)
  const authApi = useApi<
    AuthResponse,
    [AuthRequest]
  >(authenticate)

  // Combined raw error from API hooks (now includes requestOtpError)
  const rawError = requestOtpError || validateOTPApi.error || authApi.error

  // Derived state for user-facing error message (includes internalError)
  const errorMessage = useMemo(() => internalError || rawError?.message || '', [rawError, internalError]);

  // Reset API errors AND internal error when OTP changes
  useEffect(() => {
    if (otp) {
      resetRequestOtpError() // Reset the request error too
      validateOTPApi.reset()
      authApi.reset()
    }
  }, [otp, validateOTPApi.reset, authApi.reset]); // Add resetRequestOtpError

  // Computed loading state (now includes requestOtpLoading)
  const isLoading = requestOtpLoading || validateOTPApi.loading || authApi.loading

  // Timer management
  useEffect(() => {
    if (resendCooldown <= 0) return

    const timer = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [resendCooldown])

  // API handlers
  const handleResendOTP = useCallback(async () => {
    if (resendCooldown > 0 || !email || requestOtpLoading) return; // Add loading check
    
    // Reset other errors before resending
    validateOTPApi.reset();
    authApi.reset();
    setInternalError(null);
    setOtp('');
    
    const success = await sendOtpRequest(email);
    if (success) {
      console.log('OTP resend request successful.');
      setResendCooldown(COOLDOWN_DURATION);
    } else {
      console.error('OTP resend request failed.');
      // Error message should be automatically set by useRequestOTP hook
    }
  }, [resendCooldown, email, requestOtpLoading, sendOtpRequest, validateOTPApi, authApi]); // Updated dependencies

  const handleVerify = useCallback(async () => {
    if (isLoading) {
      console.log('handleVerify skipped: Already loading')
      return
    }

    if (!email || !otp) {
      console.error('Email and OTP are required for verification')
      return
    }
    
    // Reset other errors before attempting validation
    validateOTPApi.reset();
    authApi.reset();
    setInternalError(null);
    resetRequestOtpError();

    try {
      // --- Step 1: Validate OTP --- 
      const validateResponse = await validateOTPApi.execute({ email, otp })

      // Check for error AFTER execution OR missing token
      if (validateOTPApi.error || !validateResponse?.data?.token) {
        console.log('validateOTPApi.error', validateOTPApi);
        console.error('OTP Validation failed:', validateOTPApi.error || 'No token received')
        // Error message is already set via useMemo, just stop the process.
        return
      }

      const { token } = validateResponse.data;

      // --- Step 2: Authenticate with Token ---
      const authResponse = await authApi.execute({ token })

      // Check for error AFTER execution OR missing tokens
      if (authApi.error || !authResponse?.data?.access_token || !authResponse?.data?.refresh_token) {
        console.error('Authentication failed:', authApi.error || 'Incomplete auth response')
        // Error message is already set via useMemo, just stop the process.
        return
      }

      // --- Success Path --- 
      const { access_token, refresh_token } = authResponse.data;

      // --- Store Tokens Step --- 
      try {
        signIn(access_token, refresh_token);

      } catch (storageError) {
        // Handle storage-specific errors
        console.error('Failed to save tokens:', storageError);
        setInternalError('Failed to save your session. Please try again.');
        return; // Stop execution if storage fails
      }

    } catch (error) {
      // This outer catch handles errors from validate/auth steps primarily
      // or other unexpected errors before the storage step.
      console.error('Verification API process failed:', error);
      // The errorMessage state will be set by the failed useApi hook.
      // We could set a generic internal error if no API error was caught:
      if (!validateOTPApi.error && !authApi.error && !internalError) {
         setInternalError('An unexpected error occurred during verification.');
       }
    }
  }, [email, otp, validateOTPApi.execute, validateOTPApi.reset, authApi.execute, authApi.reset, signIn])

  return {
    // Input state
    otp,
    setOtp,

    // Expose the processed error message, not the raw error
    errorMessage,

    // Loading and error states
    loading: isLoading,

    // Actions
    handleVerify,
    handleResendOTP,

    // UI helpers
    resendCooldown,
  }
} 