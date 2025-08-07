import React, { useState } from 'react';
import { StyleSheet, View, Text, Platform, Pressable } from 'react-native';
import { paddings, borderRadii } from '@/features/shared/theme/spacing';
import { useTheme } from '@/features/shared/context/ThemeContext';
import { Theme } from '@/features/shared/context/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { iconSizes } from '@/features/shared/theme/sizes';
import { ChatEvent, ToolPayload } from '@/api/types/chat.types';

interface ToolCallProps {
  item: ChatEvent;
  highlight?: boolean;
}

export const ToolCall: React.FC<ToolCallProps> = React.memo(({ item, highlight }) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);
  const [isOpen, setIsOpen] = useState(false);
  const payload = item.payload as ToolPayload;


  const toggleOpen = () => setIsOpen(!isOpen);
  const isCompleted = payload.status === 'completed';
  const hasError = payload.status === 'error';

  return (
    <View style={[styles.toolCallContainer, highlight && styles.highlighted]}>
      <View style={styles.headerContainer}>
        <View style={styles.headerTextContainer}>
          <View style={styles.toolNameContainer}>
            <Ionicons 
              name={isCompleted ? "checkmark-circle-outline" : hasError ? "alert-circle-outline" : "cog-outline"} 
              size={iconSizes.small} 
              color={hasError ? theme.colors.indicators.error : theme.colors.text.secondary} 
            />
            <Text style={styles.toolName}>
              {payload.tool_name}
            </Text>
          </View>
          <Text style={styles.toolStatus}>
            {payload.status}
          </Text>
        </View>
        <Pressable onPress={toggleOpen} style={styles.toggleButton}>
          <Ionicons 
            name={isOpen ? 'chevron-up-outline' : 'chevron-down-outline'} 
            size={iconSizes.medium}
            color={theme.colors.text.secondary} 
          />
        </Pressable>
      </View>
      
      {isOpen && (
        <View style={styles.detailsContainer}>
          {payload.input_payload && (
            <View style={styles.payloadSection}>
              <Text style={styles.payloadLabel}>Input:</Text>
              <Text style={styles.payloadData} selectable>
                {JSON.stringify(payload.input_payload, null, 2)}
              </Text>
            </View>
          )}
          {payload.output_payload && (
            <View style={styles.payloadSection}>
              <Text style={styles.payloadLabel}>Output:</Text>
              <Text style={styles.payloadData} selectable>
                {JSON.stringify(payload.output_payload, null, 2)}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
});

const getStyles = (theme: Theme) => StyleSheet.create({
  toolCallContainer: {
    marginBottom: paddings.medium,
    padding: paddings.small,
    backgroundColor: theme.colors.layout.background,
    borderRadius: borderRadii.medium,
    borderWidth: 1,
    borderColor: theme.colors.layout.border,
  },
  highlighted: {
    borderWidth: 2,
    borderColor: theme.colors.brand.primary,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTextContainer: {
    flex: 1,
    marginRight: paddings.small,
  },
  toolNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: paddings.xsmall,
  },
  toolName: {
    color: theme.colors.text.primary,
    fontWeight: '600',
    marginLeft: paddings.small,
  },
  toolStatus: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    marginLeft: iconSizes.small + paddings.small,
  },
  toggleButton: {
    padding: paddings.small,
  },
  detailsContainer: {
    marginTop: paddings.small,
    paddingTop: paddings.small,
    borderTopWidth: 1,
    borderTopColor: theme.colors.layout.border,
  },
  payloadSection: {
    marginBottom: paddings.small,
  },
  payloadLabel: {
    color: theme.colors.text.secondary,
    fontSize: 12,
    marginBottom: paddings.xsmall,
  },
  payloadData: {
    color: theme.colors.text.primary,
    backgroundColor: theme.colors.layout.foreground,
    padding: paddings.small,
    borderRadius: borderRadii.small,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 12,
  },
}); 