import React, { useState, useEffect, useRef, useMemo } from 'react';
import { StyleSheet, View, Pressable, Text, ActivityIndicator, Platform, ScrollView } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/features/shared/context/ThemeContext';
import { ChatEvent, ToolPayload, ToolExecution } from '@/api/types/chat.types';
import { paddings, borderRadii } from '@/features/shared/theme/spacing';
import { Ionicons } from '@expo/vector-icons';
import { iconSizes } from '@/features/shared/theme/sizes';
import { CollapsibleToolCallStep } from './CollapsibleToolCallStep';

interface ToolMessageProps {
  item: ChatEvent;
}

export const ToolMessage: React.FC<ToolMessageProps> = React.memo(({ item }) => {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const toolPayload = item.payload as ToolPayload | null;
  const toolCalls = toolPayload?.tool_calls || [];
  const status = toolPayload?.status || 'started'; // Default to 'started' if undefined
  
  // Early return if no payload exists - shouldn't happen but prevents crashes
  if (!toolPayload) {
    return null;
  }
  const isInProgress = status === 'started' || status === 'in_progress';
  const hasError = status === 'error';
  const isCompleted = status === 'completed';
  
  // Get the latest tool call for display
  const latestToolCall = toolCalls[toolCalls.length - 1];
  const hasToolCalls = toolCalls.length > 0;
  
  // Dropdown animation
  const dropdownMaxHeight = useSharedValue(0);

  useEffect(() => {
    if (isExpanded && toolCalls.length > 0) {
      // Animate dropdown open - slide down
      dropdownMaxHeight.value = withTiming(500, { duration: 300 });
    } else {
      // Animate dropdown close - slide up
      dropdownMaxHeight.value = withTiming(0, { duration: 300 });
    }
  }, [isExpanded, toolCalls.length]);

  const dropdownAnimatedStyle = useAnimatedStyle(() => {
    return {
      maxHeight: dropdownMaxHeight.value,
      overflow: 'hidden',
    };
  });

  const toggleExpanded = () => {
    if (toolCalls.length > 0) {
      setIsExpanded(!isExpanded);
    }
  };

  const toolIcon = useMemo(() => {
    if (isInProgress) {
      return (
        <Ionicons 
          name="cog" 
          size={iconSizes.small} 
          color={theme.colors.text.primary} 
        />
      );
    } else if (hasError) {
      return (
        <Ionicons 
          name="alert-circle" 
          size={iconSizes.small} 
          color={theme.colors.indicators.error} 
        />
      );
    } else if (isCompleted) {
      return (
        <Ionicons 
          name="checkmark-circle" 
          size={iconSizes.small} 
          color={theme.colors.text.primary} 
        />
      );
    } else {
      return (
        <Ionicons 
          name="cog" 
          size={iconSizes.small} 
          color={theme.colors.text.primary} 
        />
      );
    }
  }, [status, theme.colors.text.primary, theme.colors.indicators.error]);

  const chevronIcon = useMemo(() => (
    toolCalls.length > 0 ? (
      <Ionicons
        name={isExpanded ? 'chevron-down' : 'chevron-forward'}
        size={iconSizes.small}
        color={theme.colors.text.secondary}
      />
    ) : null
  ), [toolCalls.length, isExpanded, theme.colors.text.secondary]);

  const renderContent = () => {
    if (isInProgress && !item.content) {
      return (
        <Text style={[styles.contentText, { color: theme.colors.text.secondary }]}>
          Running tools...
        </Text>
      );
    }

    if (!item.content && !isInProgress) {
      return (
        <Text style={[styles.contentText, { color: theme.colors.text.secondary }]}>
          Tool Execution
        </Text>
      );
    }

    return (
      <Text style={[styles.contentText, { color: isCompleted ? theme.colors.text.primary : theme.colors.text.secondary }]}>
        {item.content}
      </Text>
    );
  };

  const formatToolCallInput = (toolCall: ToolExecution) => {
    if (!toolCall.input_payload || Object.keys(toolCall.input_payload).length === 0) {
      return 'No input';
    }
    
    const firstKey = Object.keys(toolCall.input_payload)[0];
    const firstValue = toolCall.input_payload[firstKey];
    
    if (typeof firstValue === 'string' && firstValue.length > 50) {
      return `${firstKey}: ${firstValue.substring(0, 50)}...`;
    }
    
    return `${firstKey}: ${JSON.stringify(firstValue)}`;
  };

  const formatToolCallOutput = (toolCall: ToolExecution) => {
    if (!toolCall.output_payload || Object.keys(toolCall.output_payload).length === 0) {
      return 'No output yet';
    }
    
    return JSON.stringify(toolCall.output_payload, null, 2);
  };

  return (
    <View style={[
      styles.container, 
      { 
        backgroundColor: theme.colors.layout.foreground,
        borderColor: hasError ? theme.colors.indicators.error : theme.colors.layout.border,
      }
    ]}>
      <Pressable 
        style={styles.header} 
        onPress={toggleExpanded}
      >
        <View style={styles.headerContent}>
          <View style={styles.icon}>
            {isInProgress ? (
              <ActivityIndicator size="small" color={theme.colors.text.primary} />
            ) : (
              toolIcon
            )}
          </View>
          <View style={styles.contentContainer}>
            {renderContent()}
          </View>
        </View>
        <View style={styles.dropdownIconContainer}>
          {chevronIcon}
        </View>
      </Pressable>

      <Animated.View style={dropdownAnimatedStyle}>
        {toolCalls.length > 0 ? (
          <ScrollView 
            style={styles.trajectoryContainer} 
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
          >
            {toolCalls.map((toolCall, index) => (
              <CollapsibleToolCallStep
                key={index}
                toolCall={toolCall}
                index={index}
                theme={theme}
                formatToolCallInput={formatToolCallInput}
                formatToolCallOutput={formatToolCallOutput}
                isLast={index === toolCalls.length - 1}
              />
            ))}
          </ScrollView>
        ) : null}
        
        {!isInProgress && toolCalls.length === 0 ? (
          <View style={styles.doneContainer}>
            <View style={styles.doneContent}>
              <Ionicons 
                name="cog" 
                size={iconSizes.small} 
                color={theme.colors.text.primary} 
              />
              <Text style={[styles.doneText, { color: theme.colors.text.primary }]}>
                No tool calls
              </Text>
            </View>
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    alignSelf: 'flex-start',
    maxWidth: '85%',
    borderRadius: borderRadii.medium,
    borderWidth: 1,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: paddings.medium,
    paddingVertical: paddings.small,
    minHeight: 44,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  icon: {
    marginRight: paddings.small,
    width: iconSizes.small,
    height: iconSizes.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flexShrink: 1,
  },
  contentText: {
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 20,
  },
  dropdownIconContainer: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: paddings.small,
  },
  trajectoryContainer: {
    maxHeight: 400,
    paddingHorizontal: paddings.medium,
  },
  doneContainer: {
    padding: paddings.medium,
    alignItems: 'center',
  },
  doneContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  doneText: {
    fontSize: 14,
    fontWeight: '600',
    marginLeft: paddings.small,
  },
}); 