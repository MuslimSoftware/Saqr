import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '@/features/shared/context/ThemeContext';

interface NotificationBadgeProps {
  count: number;
  maxCount?: number;
}

export const NotificationBadge: React.FC<NotificationBadgeProps> = ({ 
  count, 
  maxCount = 99 
}) => {
  const { theme } = useTheme();

  if (count === 0) {
    return null;
  }

  const displayCount = count > maxCount ? `${maxCount}+` : count.toString();

  return (
    <View style={[styles.badge, { backgroundColor: theme.colors.indicators.error }]}>
      <Text style={[styles.badgeText, { color: 'white' }]}>
        {displayCount}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 13,
  },
}); 