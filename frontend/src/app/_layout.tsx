import React, { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import 'react-native-reanimated'
import { useTheme } from '@/features/shared/context/ThemeContext'
import { AuthProvider } from '@/features/auth/context/AuthContext'
import { ThemeProvider } from '@/features/shared/context/ThemeContext'
import * as SystemUI from 'expo-system-ui'

function RootLayoutNav() {
  const { isDark, theme } = useTheme();

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.layout.background);
  }, [theme.colors.layout.background]);

  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: theme.colors.layout.background },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            animation: 'none',
          }}
        />
        <Stack.Screen
          name="(main)"
          options={{
            animation: 'none',
          }}
        />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar
        style={isDark ? 'light' : 'dark'}
        backgroundColor={theme.colors.layout.background}
      />
    </>
  )
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </ThemeProvider>
  )
}
