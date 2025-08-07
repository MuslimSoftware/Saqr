import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import { ChatEvent } from '@/api/types/chat.types';
import { BaseMessage } from './BaseMessage';
import { useTheme } from '@/features/shared/context/ThemeContext';
import { paddings, borderRadii } from '@/features/shared/theme/spacing';

interface ThinkingMessageProps {
  item: ChatEvent;
}

export const ThinkingMessage: React.FC<ThinkingMessageProps> = React.memo(({ item }) => {
  const { theme } = useTheme();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [opacity]);

  return (
    <BaseMessage
      item={item}
      isUser={false}
    >
      <View style={styles.skeletonContainer}>
        <Animated.View
          style={[
            styles.skeletonLine,
            { backgroundColor: theme.colors.indicators.loading, opacity }
          ]}
        />
      </View>
    </BaseMessage>
  );
});

const styles = StyleSheet.create({
  skeletonContainer: {
    alignItems: 'flex-start',
    paddingVertical: paddings.xsmall,
  },
  skeletonLine: {
    width: 250,
    height: paddings.large,
    borderRadius: borderRadii.medium,
  },
});