import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ChatEvent } from '@/api/types/chat.types';
import { BaseMessage } from './BaseMessage';
import { TextBody } from '@/features/shared/components/text';
import { useTheme } from '@/features/shared/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';

interface ErrorMessageProps {
  item: ChatEvent;
}

export const ErrorMessage: React.FC<ErrorMessageProps> = React.memo(({ item }) => {
  const { theme } = useTheme();
  const isAgent = item.author === 'agent';

  return (
    <BaseMessage 
      item={item}
      isUser={!isAgent}
      hasError={true}
    >
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={16} color={theme.colors.indicators.error} style={styles.icon} />
        <TextBody style={{ color: theme.colors.indicators.error }}>
          {item.content}
        </TextBody>
      </View>
    </BaseMessage>
  );
});

const styles = StyleSheet.create({
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
}); 