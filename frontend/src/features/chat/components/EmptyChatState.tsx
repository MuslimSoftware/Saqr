import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/features/shared/context/ThemeContext';
import { TextHeader, TextBody } from '@/features/shared/components/text';
import { PrimaryButton } from '@/features/shared/components/buttons';
import { Ionicons } from '@expo/vector-icons';
import { paddings, gaps } from '@/features/shared/theme/spacing';
import { iconSizes } from '@/features/shared/theme/sizes';
import { useChat } from '../context';

export const EmptyChatState: React.FC = () => {
  const { theme } = useTheme();
  const { startNewChat, creatingChat } = useChat();

  const handleStartNewChat = async () => {
    await startNewChat();
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.iconContainer, { backgroundColor: theme.colors.layout.foreground }]}>
          <Ionicons 
            name="chatbubbles-outline" 
            size={iconSizes.xlarge} 
            color={theme.colors.text.secondary} 
          />
        </View>
        
        <TextHeader style={[styles.title, { color: theme.colors.text.primary }]}>
          Welcome to Saqr
        </TextHeader>
        
        <TextBody style={[styles.subtitle, { color: theme.colors.text.secondary }]}>
          Start a conversation to begin your journey with AI assistance
        </TextBody>
        
        <PrimaryButton
          label="Start New Chat"
          onPress={handleStartNewChat}
          disabled={creatingChat}
          style={styles.button}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: paddings.large,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: gaps.large,
  },
  title: {
    textAlign: 'center',
    marginBottom: gaps.small,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: gaps.xlarge,
    lineHeight: 22,
  },
  button: {
    minWidth: 180,
  },
}); 