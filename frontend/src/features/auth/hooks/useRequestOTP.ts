import { useCallback } from 'react';
import { useApi } from '@/api/useApi';
import { requestOTP } from '@/api/endpoints/authApi';
import { RequestOTPResponse, OTPRequest } from '@/api/types/auth.types';

export function useRequestOTP() {
  const { 
    execute: executeRequestOTP, 
    loading, 
    error, 
    reset
  } = useApi<RequestOTPResponse, [OTPRequest]>(requestOTP);

  const sendOTP = useCallback(async (email: string): Promise<boolean> => {
    try {
      await executeRequestOTP({ email });
      return true;
    } catch (err) {
      console.error('useRequestOTP Error:', err);
      return false;
    }
  }, [executeRequestOTP]);

  return {
    sendOTP,
    loading,
    error,
    reset
  };
} 