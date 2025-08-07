import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Pressable, Text, Platform } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { ToolExecution } from '@/api/types/chat.types';
import { paddings, borderRadii } from '@/features/shared/theme/spacing';
import { Ionicons } from '@expo/vector-icons';
import { iconSizes } from '@/features/shared/theme/sizes';
import { ScrollablePayload } from './ScrollablePayload';

interface CollapsibleToolCallStepProps {
  toolCall: ToolExecution;
  index: number;
  theme: any;
  formatToolCallInput: (toolCall: ToolExecution) => string;
  formatToolCallOutput: (toolCall: ToolExecution) => string;
  isLast?: boolean;
}

export const CollapsibleToolCallStep: React.FC<CollapsibleToolCallStepProps> = ({ 
  toolCall, 
  index, 
  theme, 
  formatToolCallInput, 
  formatToolCallOutput,
  isLast = false
}) => {
  const [isStepExpanded, setIsStepExpanded] = useState(false);
  const stepDropdownHeight = useSharedValue(0);

  useEffect(() => {
    if (isStepExpanded) {
      stepDropdownHeight.value = withTiming(300, { duration: 300 });
    } else {
      stepDropdownHeight.value = withTiming(0, { duration: 300 });
    }
  }, [isStepExpanded]);

  const stepAnimatedStyle = useAnimatedStyle(() => {
    return {
      maxHeight: stepDropdownHeight.value,
      overflow: 'hidden',
    };
  });

  const toggleStepExpanded = () => {
    setIsStepExpanded(!isStepExpanded);
  };

  const getStatusIcon = () => {
    if (toolCall.status === 'started' || toolCall.status === 'in_progress') {
      return <Ionicons name="cog" size={iconSizes.small} color={theme.colors.brand.primary} />;
    } else if (toolCall.status === 'error') {
      return <Ionicons name="close-circle" size={iconSizes.small} color={theme.colors.indicators.error} />;
    } else {
      return <Ionicons name="checkmark-circle" size={iconSizes.small} color={theme.colors.indicators.success} />;
    }
  };

  const getStatusColor = () => {
    return toolCall.status === 'error' ? theme.colors.indicators.error : theme.colors.text.secondary;
  };

  const getFirstKwarg = () => {
    if (!toolCall.input_payload || Object.keys(toolCall.input_payload).length === 0) {
      return null;
    }
    
    const firstKey = Object.keys(toolCall.input_payload)[0];
    const firstValue = toolCall.input_payload[firstKey];
    
    // Format the value for display
    if (typeof firstValue === 'string') {
      // Truncate long strings
      return firstValue.length > 100 ? `${firstValue.substring(0, 100)}...` : firstValue;
    }
    
    // For non-strings, convert to string and truncate if needed
    const stringValue = JSON.stringify(firstValue);
    return stringValue.length > 100 ? `${stringValue.substring(0, 100)}...` : stringValue;
  };

  const firstKwarg = getFirstKwarg();

  return (
    <View 
      key={index} 
      style={[
        styles.toolCallStep,
        !isLast && styles.toolCallStepWithDivider
      ]}
    >
      <Pressable style={styles.stepHeader} onPress={toggleStepExpanded}>
        <View style={styles.stepIcon}>
          {getStatusIcon()}
        </View>
        <View style={styles.toolNameContainer}>
          <Text style={[styles.toolName, { color: theme.colors.text.primary }]}>
            {toolCall.tool_name}
          </Text>
          {firstKwarg && (
            <Text style={[styles.firstKwarg, { color: theme.colors.text.secondary }]}>
              {firstKwarg}
            </Text>
          )}
        </View>
        <Text style={[styles.toolStatus, { color: getStatusColor() }]}>
          {toolCall.status}
        </Text>
        <View style={styles.stepDropdownIcon}>
          <Ionicons
            name={isStepExpanded ? 'chevron-down' : 'chevron-forward'}
            size={iconSizes.xsmall}
            color={theme.colors.text.secondary}
          />
        </View>
      </Pressable>
      
      <Animated.View style={stepAnimatedStyle}>
        <View style={styles.stepContent}>
          <View style={styles.payloadSection}>
            <Text style={[styles.payloadLabel, { color: theme.colors.text.secondary }]}>Input:</Text>
            <ScrollablePayload maxHeight={120}>
              <Text style={[styles.payloadData, { 
                color: theme.colors.text.primary,
                backgroundColor: theme.colors.layout.background 
              }]} selectable>
                {formatToolCallInput(toolCall)}
              </Text>
            </ScrollablePayload>
          </View>
          
          {toolCall.output_payload && (
            <View style={styles.payloadSection}>
              <Text style={[styles.payloadLabel, { color: theme.colors.text.secondary }]}>Output:</Text>
              <ScrollablePayload maxHeight={120}>
                <Text style={[styles.payloadData, { 
                  color: theme.colors.text.primary,
                  backgroundColor: theme.colors.layout.background 
                }]} selectable>
                  {formatToolCallOutput(toolCall)}
                </Text>
              </ScrollablePayload>
            </View>
          )}
          
          {toolCall.error && (
            <View style={styles.payloadSection}>
              <Text style={[styles.payloadLabel, { color: theme.colors.indicators.error }]}>Error:</Text>
              <ScrollablePayload maxHeight={120}>
                <Text style={[styles.payloadData, { 
                  color: theme.colors.indicators.error,
                  backgroundColor: theme.colors.layout.background 
                }]} selectable>
                  {toolCall.error}
                </Text>
              </ScrollablePayload>
            </View>
          )}
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  toolCallStep: {
  },
  toolCallStepWithDivider: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: paddings.medium,
  },
  stepIcon: {
    marginRight: paddings.small,
    width: iconSizes.small,
    height: iconSizes.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolNameContainer: {
    flex: 1,
    marginRight: paddings.small,
    flexDirection: 'column',
    gap: paddings.xsmall,
  },
  toolName: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  firstKwarg: {
    fontSize: 12,
    fontWeight: '400',
    fontStyle: 'italic',
  },
  toolStatus: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    marginRight: paddings.small,
  },
  stepDropdownIcon: {
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepContent: {
    marginLeft: iconSizes.small + paddings.small,
  },
  payloadSection: {
    marginBottom: paddings.small,
  },
  payloadLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: paddings.xsmall,
  },
  payloadData: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    padding: paddings.small,
    lineHeight: 16,
  },
}); 