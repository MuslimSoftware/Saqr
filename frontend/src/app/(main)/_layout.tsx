import { Stack } from 'expo-router'
import React from 'react'
import { useTheme } from '@/features/shared/context/ThemeContext'

export default function TabLayout() {
  const { theme } = useTheme()

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.colors.layout.foreground }
      }}
    >
      <Stack.Screen name="chat" />
    </Stack>
  )
}
