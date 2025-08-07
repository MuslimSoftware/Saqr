import { Stack } from 'expo-router'
import React, { useEffect } from 'react'
import { useRouter } from 'expo-router'

export default function AuthLayout() {
  const router = useRouter();

  // In demo mode, always redirect to chat - no auth needed
  useEffect(() => {
    router.replace('/chat');
  }, []);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="landing" options={{ title: 'Welcome' }} />
      <Stack.Screen name="email" options={{ title: 'Enter Email' }} />
      <Stack.Screen name="otp" options={{ title: 'Verify OTP' }} />
    </Stack>
  )
}
