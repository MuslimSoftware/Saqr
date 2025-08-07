import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, ActivityIndicator, ScrollView } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { ChatEvent, ReasoningPayload } from '@/api/types/chat.types';
import { useTheme } from '@/features/shared/context/ThemeContext';
import { paddings, borderRadii } from '@/features/shared/theme/spacing';
import { iconSizes } from '@/features/shared/theme/sizes';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

interface ReasoningMessageProps {
  item: ChatEvent;
}

export const ReasoningMessage: React.FC<ReasoningMessageProps> = React.memo(({ item }) => {
  const { theme } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const reasoningPayload = item.payload as ReasoningPayload | null;
  const trajectory = reasoningPayload?.trajectory || [];
  const isThinking = reasoningPayload?.status === 'thinking';
  const isComplete = reasoningPayload?.status === 'complete';
  const hasContent = item.content && item.content.trim() !== '';

  // Dropdown animation - use maxHeight for smooth slide effect without hardcoded calculations
  const dropdownMaxHeight = useSharedValue(0);

  useEffect(() => {
    if (isExpanded && (trajectory.length > 0 || !isThinking)) {
      // Use a large maxHeight value to allow natural content sizing
      dropdownMaxHeight.value = withTiming(2000, { duration: 300 });
    } else {
      // Animate dropdown close - slide up
      dropdownMaxHeight.value = withTiming(0, { duration: 300 });
    }
  }, [isExpanded, trajectory.length, isThinking]);

  const dropdownAnimatedStyle = useAnimatedStyle(() => {
    return {
      maxHeight: dropdownMaxHeight.value,
      overflow: 'hidden',
    };
  });

  const toggleExpanded = () => {
    if (trajectory.length > 0 || !isThinking) {
      setIsExpanded(!isExpanded);
    }
  };

  const renderContent = () => {
    if (isThinking && !hasContent) {
      return (
        <Text style={[styles.contentText, { color: theme.colors.text.secondary }]}>
          Thinking...
        </Text>
      );
    }

    if (!hasContent && !isThinking) {
      return (
        <Text style={[styles.contentText, { color: theme.colors.text.secondary }]}>
          Agent Reasoning
        </Text>
      );
    }

    return (
      <Text style={[styles.contentText, { color: isThinking ? theme.colors.text.secondary : theme.colors.text.primary }]}>
        {item.content}
      </Text>
    );
  };

  return (
    <View style={[
      styles.container,
      {
        backgroundColor: theme.colors.layout.foreground,
        borderColor: theme.colors.layout.border,
      }
    ]}>
      <Pressable
        style={styles.header}
        onPress={toggleExpanded}
      >
        <View style={styles.headerContent}>
          <View style={styles.icon}>
            {isThinking ? (
              <ActivityIndicator size="small" color={theme.colors.text.primary} />
            ) : (
              <MaterialCommunityIcons name="thought-bubble" size={iconSizes.small} color={theme.colors.text.primary} />
            )}
          </View>
          <View style={styles.contentContainer}>
            {renderContent()}
          </View>
        </View>
        <View style={styles.dropdownIconContainer}>
          {(trajectory.length > 0 || !isThinking) ? (
            <Ionicons
              name={isExpanded ? 'chevron-down' : 'chevron-forward'}
              size={iconSizes.small}
              color={theme.colors.text.secondary}
            />
          ) : null}
        </View>
      </Pressable>

      <Animated.View style={dropdownAnimatedStyle}>
        {trajectory.length > 0 ? (
          <ScrollView 
            style={styles.trajectoryScrollView}
            contentContainerStyle={styles.trajectoryContainer}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={true}
          >
            {trajectory.map((step, index) => {
              const isLastStep = index === trajectory.length - 1;
              const isFinalReasoning = isComplete && isLastStep;
              
              return (
                <View key={index} style={[
                  styles.trajectoryStep,
                  isFinalReasoning && styles.finalReasoningStep
                ]}>
                  <View style={styles.bulletContainer}>
                    <View style={[
                      styles.bullet, 
                      { 
                        backgroundColor: isFinalReasoning 
                          ? theme.colors.text.primary 
                          : theme.colors.text.secondary 
                      }
                    ]} />
                  </View>
                  <Text style={[
                    styles.stepText, 
                    { 
                      color: theme.colors.text.primary,
                      fontWeight: isFinalReasoning ? '600' : '400'
                    }
                  ]}>
                    {step}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        ) : null}

        {!isThinking && trajectory.length === 0 ? (
          <View style={styles.doneContainer}>
            <View style={styles.doneContent}>
              <Ionicons
                name="bulb"
                size={iconSizes.small}
                color={theme.colors.text.primary}
              />
              <Text style={[styles.doneText, { color: theme.colors.text.primary }]}>
                Done
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
    alignSelf: 'flex-start', // Don't take full width
    maxWidth: '85%', // Limit width
    borderRadius: borderRadii.medium,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: paddings.medium,
    paddingVertical: paddings.small,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1, // Allow content to shrink
  },
  icon: {
    marginRight: paddings.small,
    width: iconSizes.small, // Fixed width to prevent layout shifts
    height: iconSizes.small, // Fixed height to prevent layout shifts
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flexShrink: 1, // Allow text to shrink if needed
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
    marginLeft: paddings.small, // Add left margin for spacing
  },
  trajectoryScrollView: {
    maxHeight: '100%',
  },
  trajectoryContainer: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: paddings.small,
    paddingHorizontal: paddings.medium,
    backgroundColor: 'transparent', // Ensure no background color interference
  },
  trajectoryStep: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: paddings.small,
    paddingVertical: paddings.xsmall,
    paddingHorizontal: paddings.small,
    borderRadius: borderRadii.small,
    marginBottom: paddings.xsmall,
  },
  finalReasoningStep: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)', // Even more subtle highlight background
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)', // Subtle border
  },
  bulletContainer: {
    height: '100%',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: paddings.xsmall,
  },
  bullet: {
    width: 10,
    height: 10,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
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