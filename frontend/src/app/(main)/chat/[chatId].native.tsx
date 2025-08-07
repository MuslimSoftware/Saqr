import React from 'react';
import { StyleSheet, Pressable } from 'react-native';
import { Stack, useLocalSearchParams, useNavigation } from 'expo-router';
import { FgView } from '@/features/shared/components/layout';
import { ChatInput } from '@/features/chat/components/ChatInput';
import { useChat } from '@/features/chat/context';
import { useTheme } from '@/features/shared/context/ThemeContext';
import { TextBody } from '@/features/shared/components/text';
import { ChatDetailHeader } from '@/features/chat/components/ChatDetailHeader.native';
import { Ionicons } from '@expo/vector-icons';
import { iconSizes } from '@/features/shared/theme/sizes';
import { CombinedMessageList } from '@/features/chat/components/CombinedMessageList';

export default function NativeChatDetailScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const { theme } = useTheme();
  const {
    chatListData,
    updateChat,
    updatingChat,
  } = useChat();
  const navigation = useNavigation();

  const currentChat = chatListData?.items?.find(chat => chat._id === chatId);
  const originalName = currentChat?.name || 'Chat';

  if (!chatId) {
      return <FgView><TextBody>Error: Chat ID missing</TextBody></FgView>;
  }

  return (
    <FgView style={styles.container}> 
      <Stack.Screen
        options={{
          headerTitle: () => (
             <ChatDetailHeader 
                chatId={chatId}
                originalName={originalName}
                updatingChat={updatingChat}
                updateChat={updateChat}
             />
          ),
          headerTitleAlign: 'center',
          headerLeft: () => (
            <Pressable 
              onPress={() => navigation.goBack()}
            >
              <Ionicons 
                name="chevron-back-outline"
                size={iconSizes.medium}
                color={theme.colors.text.primary}
              />
            </Pressable>
          ),
          headerStyle: { 
              backgroundColor: theme.colors.layout.background,
          },
          headerShadowVisible: false,
        }}
      />
      <CombinedMessageList />
      <ChatInput />
    </FgView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
}); 