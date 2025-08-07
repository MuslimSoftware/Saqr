import React, { memo } from 'react';
import {
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { BaseRow, BgView, FgView } from '@/features/shared/components/layout';
import { paddings, borderRadii, gaps } from '@/features/shared/theme/spacing';
import { useTheme } from '@/features/shared/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { iconSizes } from '@/features/shared/theme/sizes';
import { Colors } from '@/features/shared/theme/colors';
import { useChat } from '../context';
import { BaseInput } from '@/features/shared';

interface ChatInputProps {}

const ChatInputComponent: React.FC<ChatInputProps> = ({}) => {
  const { theme } = useTheme();
  const { currentMessage, setCurrentMessageText, sendMessage } = useChat(); 

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <BgView style={styles.inputContainer}>
        <BaseRow style={styles.inputRow}> 
          <BaseInput 
            inputStyle={styles.textInput}
            placeholder="Message Saqr"
            placeholderTextColor={theme.colors.text.secondary}
            value={currentMessage}
            onChangeText={setCurrentMessageText}
            multiline
          />
          <FgView style={styles.sendButtonContainer}>
            <Pressable onPress={sendMessage} style={styles.sendButton} disabled={currentMessage.trim().length === 0}>
              <Ionicons 
                name="send-outline" 
                size={iconSizes.small} 
                color={currentMessage.trim().length === 0 ? theme.colors.text.disabled : Colors.gray50}
              />
            </Pressable>
          </FgView>
        </BaseRow>
      </BgView>
    </KeyboardAvoidingView>
  );
};

export const ChatInput = memo(ChatInputComponent);

const styles = StyleSheet.create({
  inputContainer: {
    padding: paddings.small,
    borderRadius: borderRadii.large,
    marginBottom: Platform.select({ ios: paddings.large, android: paddings.large, web: paddings.medium }),
    marginHorizontal: paddings.medium,
  },
  inputRow: {
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    maxHeight: 100,
    marginRight: gaps.small, 
    padding: paddings.small,
    borderRadius: borderRadii.medium,
  },
  sendButtonContainer: {
      borderRadius: borderRadii.round,
      padding: paddings.small,
  },
  sendButton: {
    padding: paddings.small,
  },
}); 