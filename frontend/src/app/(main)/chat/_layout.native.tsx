import React from 'react';
import { Stack } from 'expo-router';
import { ChatProvider } from '@/features/chat/context';
import { useTheme } from '@/features/shared/context/ThemeContext';

export default function ChatLayout() {
  const { theme } = useTheme();

  return (
    <ChatProvider>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.layout.background },
          headerTintColor: theme.colors.text.primary,
          headerTitleStyle: { color: theme.colors.text.primary },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Chats' }} />
      </Stack>
    </ChatProvider>
  );
} 