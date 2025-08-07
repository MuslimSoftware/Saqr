import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, DimensionValue } from 'react-native';
import { useTheme } from '@/features/shared/context/ThemeContext';
import { paddings, borderRadii } from '@/features/shared/theme/spacing';

interface MessageSkeletonProps {
  isUser?: boolean;
  width?: DimensionValue;
}

export const MessageSkeleton: React.FC<MessageSkeletonProps> = ({ 
  isUser = false, 
  width = isUser ? '70%' : '85%' 
}) => {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { 
          toValue: 0.7, 
          duration: 800, 
          useNativeDriver: true 
        }),
        Animated.timing(opacity, { 
          toValue: 0.3, 
          duration: 800, 
          useNativeDriver: true 
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [opacity]);

  const messageRowStyle = [
    styles.messageRow,
    isUser ? styles.userRow : styles.agentRow,
  ];

  const messageBubbleStyle = [
    styles.messageBubble,
    {
      backgroundColor: theme.colors.layout.foreground,
      borderColor: 'transparent',
      borderWidth: 0,
      width,
    },
  ];

  return (
    <View style={messageRowStyle}>
      <View style={messageBubbleStyle}>
        <Animated.View
          style={[
            styles.skeletonLine,
            { 
              backgroundColor: theme.colors.indicators.loading, 
              opacity 
            }
          ]}
        />
      </View>
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
  messageBubble: {
    paddingVertical: paddings.xsmall,
    paddingHorizontal: paddings.medium,
    borderRadius: borderRadii.large,
    maxWidth: '80%',
  },
  skeletonLine: {
    height: 24,
    borderRadius: borderRadii.small,
  },
}); 