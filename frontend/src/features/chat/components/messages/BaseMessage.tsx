import React from 'react';
import { StyleSheet, View, ViewStyle, StyleProp } from 'react-native';
import { paddings, borderRadii } from '@/features/shared/theme/spacing';
import { useTheme } from '@/features/shared/context/ThemeContext';
import { ChatEvent } from '@/api/types/chat.types';
import { Brand } from '@/features/shared/components/brand/Brand';

export interface BaseMessageProps {
  item: ChatEvent;
  isUser: boolean;
  isTemporary?: boolean;
  hasError?: boolean;
  children: React.ReactNode;
  containerStyle?: StyleProp<ViewStyle>;
}

export const BaseMessage: React.FC<BaseMessageProps> = ({ 
  item, 
  isUser, 
  isTemporary, 
  hasError,
  children, 
  containerStyle 
}) => {
  const { theme } = useTheme();

  const messageRowStyle: ViewStyle[] = [
    styles.messageRow,
    isUser ? styles.userRow : styles.agentRow,
  ];

  const messageBubbleStyle: StyleProp<ViewStyle>[] = [
    styles.messageBubbleBase,
    isUser
      ? {
          backgroundColor: theme.colors.layout.background,
          borderColor: theme.colors.layout.border,
          borderWidth: 1,
        }
      : {
          backgroundColor: theme.colors.layout.foreground,
          borderColor: 'transparent',
          borderWidth: 0,
        },
    isTemporary && styles.temporaryMessage,
    hasError && styles.errorMessageBubble,
    containerStyle,
  ].filter(Boolean) as StyleProp<ViewStyle>[];

  return (
    <View style={messageRowStyle}>
      <View style={messageBubbleStyle}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  messageRow: {
    flexDirection: 'row',
    marginBottom: paddings.xsmall,
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  agentRow: {
    justifyContent: 'flex-start',
  },
  messageBubbleBase: {
    paddingVertical: paddings.xsmall,
    paddingHorizontal: paddings.medium,
    borderRadius: borderRadii.large,
    maxWidth: '80%',
    position: 'relative',
  },
  temporaryMessage: {
    opacity: 0.7,
  },
  errorMessageBubble: {
  },
}); 