import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Pressable, Text, ScrollView } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/features/shared/context/ThemeContext';
import { ToolExecution } from '@/api/types/chat.types';
import { paddings, borderRadii } from '@/features/shared/theme/spacing';
import { Ionicons } from '@expo/vector-icons';
import { iconSizes } from '@/features/shared/theme/sizes';

interface ToolCallListItemProps {
  toolCall: ToolExecution;
  isHighlighted?: boolean;
}

export const ToolCallListItem: React.FC<ToolCallListItemProps> = ({ 
  toolCall, 
  isHighlighted = false 
}) => {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const isCompleted = toolCall.status === 'completed';
  const hasError = toolCall.status === 'error';
  const isInProgress = toolCall.status === 'in_progress' || toolCall.status === 'started';
  
  // Dropdown animation
  const dropdownMaxHeight = useSharedValue(0);

  useEffect(() => {
    if (isExpanded) {
      dropdownMaxHeight.value = withTiming(300, { duration: 300 });
    } else {
      dropdownMaxHeight.value = withTiming(0, { duration: 300 });
    }
  }, [isExpanded]);

  const dropdownAnimatedStyle = useAnimatedStyle(() => {
    return {
      maxHeight: dropdownMaxHeight.value,
      overflow: 'hidden',
    };
  });

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const getStatusIcon = () => {
    if (isInProgress) {
      return (
        <Ionicons 
          name="time-outline" 
          size={iconSizes.small} 
          color={theme.colors.indicators.warning} 
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
          color={theme.colors.indicators.success} 
        />
      );
    } else {
      return (
        <Ionicons 
          name="ellipse-outline" 
          size={iconSizes.small} 
          color={theme.colors.text.secondary} 
        />
      );
    }
  };

  const getStatusText = () => {
    if (isInProgress) return 'Running...';
    if (hasError) return 'Error';
    if (isCompleted) return 'Completed';
    return 'Pending';
  };

  const formatInput = () => {
    if (!toolCall.input_payload || Object.keys(toolCall.input_payload).length === 0) {
      return 'No input';
    }
    return JSON.stringify(toolCall.input_payload, null, 2);
  };

  const formatOutput = () => {
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
        borderColor: isHighlighted 
          ? theme.colors.brand.primary 
          : hasError 
            ? theme.colors.indicators.error 
            : theme.colors.layout.border,
        borderWidth: isHighlighted ? 2 : 1,
      }
    ]}>
      <Pressable style={styles.header} onPress={toggleExpanded}>
        <View style={styles.headerContent}>
          <View style={styles.statusIcon}>
            {getStatusIcon()}
          </View>
          <View style={styles.toolInfo}>
            <Text style={[styles.toolName, { color: theme.colors.text.primary }]}>
              {toolCall.tool_name || 'Unknown Tool'}
            </Text>
            <Text style={[styles.statusText, { color: theme.colors.text.secondary }]}>
              {getStatusText()}
            </Text>
          </View>
        </View>
        <Ionicons
          name={isExpanded ? 'chevron-down' : 'chevron-forward'}
          size={iconSizes.small}
          color={theme.colors.text.secondary}
          style={styles.chevron}
        />
      </Pressable>

      <Animated.View style={dropdownAnimatedStyle}>
        <View style={styles.detailsContainer}>
          {/* Input Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Input
            </Text>
            <ScrollView 
              style={[styles.payloadContainer, { backgroundColor: theme.colors.layout.background }]}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
              <Text style={[styles.payloadText, { color: theme.colors.text.secondary }]}>
                {formatInput()}
              </Text>
            </ScrollView>
          </View>

          {/* Output Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text.primary }]}>
              Output
            </Text>
            <ScrollView 
              style={[styles.payloadContainer, { backgroundColor: theme.colors.layout.background }]}
              nestedScrollEnabled={true}
              showsVerticalScrollIndicator={true}
            >
              <Text style={[styles.payloadText, { color: theme.colors.text.secondary }]}>
                {formatOutput()}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadii.medium,
    marginVertical: paddings.xsmall,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: paddings.medium,
    paddingVertical: paddings.small,
    minHeight: 56,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  statusIcon: {
    marginRight: paddings.small,
    width: iconSizes.small,
    height: iconSizes.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toolInfo: {
    flex: 1,
  },
  toolName: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 20,
  },
  statusText: {
    fontSize: 14,
    lineHeight: 18,
    marginTop: 2,
  },
  chevron: {
    marginLeft: paddings.small,
  },
  detailsContainer: {
    paddingHorizontal: paddings.medium,
    paddingBottom: paddings.medium,
  },
  section: {
    marginBottom: paddings.small,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: paddings.xsmall,
  },
  payloadContainer: {
    maxHeight: 120,
    borderRadius: borderRadii.small,
    paddingHorizontal: paddings.small,
    paddingVertical: paddings.xsmall,
  },
  payloadText: {
    fontSize: 12,
    fontFamily: 'monospace',
    lineHeight: 16,
  },
}); 