import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { router } from 'expo-router'
import { AuthScreenLayout } from '@/features/auth/components/AuthScreenLayout'
import { AuthInput } from '@/features/auth/components/AuthInput'
import { useRequestOTP } from '@/features/auth/hooks/useRequestOTP'
import { isValidEmail } from '@/features/shared/utils/validation'

export default function EmailScreen() {
  const [email, setEmail] = useState('')
  const [validationError, setValidationError] = useState<string | null>(null)

  const {
    sendOTP,
    loading: otpLoading,
    error: otpError,
    reset: resetOtpError,
  } = useRequestOTP()

  const validateEmail = (input: string) => {
    resetOtpError()
    if (!input) {
      setValidationError('Email cannot be empty')
      return false
    }
    if (!isValidEmail(input)) {
      setValidationError('Please enter a valid email address')
      return false
    }
    setValidationError(null)
    return true
  }

  const handleEmailChange = (text: string) => {
    setEmail(text)
    if (validationError) {
      validateEmail(text)
    }
    if (otpError) {
      resetOtpError()
    }
  }

  const handleContinue = async () => {
    if (!validateEmail(email)) {
      return
    }

    const success = await sendOTP(email)

    if (success) {
      router.push({
        pathname: '/otp',
        params: { email },
      })
    }
  }

  const displayError = validationError || otpError?.message

  return (
    <AuthScreenLayout
      title="Enter Your Email"
      subtitle="We'll send you a verification code"
      buttonText={otpLoading ? 'Sending Code...' : 'Continue'}
      onButtonPress={handleContinue}
      buttonDisabled={!isValidEmail(email) || otpLoading}
    >
      <View style={styles.container}>
        <AuthInput
          label="Email"
          value={email}
          onChangeText={handleEmailChange}
          error={!!displayError}
          errorMessage={displayError}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          autoFocus={true}
        />
      </View>
    </AuthScreenLayout>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
})
