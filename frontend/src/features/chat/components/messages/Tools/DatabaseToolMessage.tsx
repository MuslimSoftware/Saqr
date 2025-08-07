import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/features/shared/context/ThemeContext';
import { TextBody } from '@/features/shared/components/text';
import { Ionicons } from '@expo/vector-icons';
import type { ChatEvent, ToolPayload } from '@/api/types/chat.types';
import { borderRadii, Colors, iconSizes, paddings } from '@/features/shared/theme';

interface DatabaseToolMessageProps {
  item: ChatEvent;
}

export const DatabaseToolMessage: React.FC<DatabaseToolMessageProps> = ({ item }) => {
  const toolPayload = item.payload as ToolPayload;
  const inputPayload = toolPayload.input_payload;
  
  // Safely extract and format the first argument for display
  const firstValue = Object.values(inputPayload)[0];
  const firstArgument = typeof firstValue === 'string' 
    ? firstValue 
    : JSON.stringify(firstValue);

  const color = toolPayload.tool_name === 'sql_query' ? Colors.red500 : Colors.green500;
  const backgroundColor = toolPayload.tool_name === 'sql_query' ? Colors.red900 : Colors.green900;

  return (
      <View style={[styles.container, { backgroundColor, borderColor: color }]}>
        <Ionicons name="server-outline" size={iconSizes.small} color={color} />
        <TextBody style={[styles.text, { color }]}> 
          {firstArgument}
        </TextBody>
      </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: paddings.xsmall,
    paddingHorizontal: paddings.small,
    borderWidth: 1,
    borderRadius: borderRadii.large,
  },
  text: {
    fontStyle: 'italic',
    marginLeft: paddings.xsmall,
  },
}); 