import React, { useEffect, useState } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { View, Text } from 'react-native'
import 'react-native-reanimated'
import { useTheme } from '@/features/shared/context/ThemeContext'
import { AuthProvider } from '@/features/auth/context/AuthContext'
import { ThemeProvider } from '@/features/shared/context/ThemeContext'
import * as SystemUI from 'expo-system-ui'
import * as Font from 'expo-font'
import { Ionicons } from '@expo/vector-icons'

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
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          ...Ionicons.font,
        });
        setFontsLoaded(true);
      } catch (error) {
        console.error('Error loading fonts:', error);
        // Still allow app to render even if font loading fails
        setFontsLoaded(true);
      }
    }

    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return (
      <ThemeProvider>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#ffffff' }}>
          <Text>Loading...</Text>
        </View>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <RootLayoutNav />
      </AuthProvider>
    </ThemeProvider>
  )
}
