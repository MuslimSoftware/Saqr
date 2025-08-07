import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { BgView, SmallRow } from '@/features/shared/components/layout';
import { ChatList } from '@/features/chat/components/ChatList';
import { AntDesign } from '@expo/vector-icons';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/features/shared/context/ThemeContext';
import { iconSizes } from '@/features/shared/theme/sizes';
import { paddings } from '@/features/shared/theme/spacing';
import { useChat } from '@/features/chat/context';

export default function NativeChatListScreen() {
  const { theme } = useTheme();
  const { startNewChat } = useChat();
  const router = useRouter();

  return (
    <BgView style={styles.container}>
      <Stack.Screen 
        options={{
          headerRight: () => (
            <SmallRow>
              <Pressable onPress={startNewChat} style={styles.headerButton}>
                <AntDesign name="plus" size={iconSizes.medium} color={theme.colors.text.primary} />
              </Pressable>
              <Pressable onPress={() => router.push('/settings')} style={styles.headerButton}>
                <Ionicons name="settings-outline" size={iconSizes.medium} color={theme.colors.text.primary} />
              </Pressable>
            </SmallRow>
          ),
        }}
      />
      <ChatList />
    </BgView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    padding: paddings.small,
    marginLeft: paddings.small,
  }
}); 