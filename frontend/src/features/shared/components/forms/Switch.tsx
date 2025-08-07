import React from 'react';
import { Switch as RNSwitch, SwitchProps as RNSwitchProps, Platform } from 'react-native';
import { useTheme } from '@/features/shared/context/ThemeContext';

export function Switch(props: RNSwitchProps) {
  const { theme } = useTheme();

  // Define standard theme-based colors
  const trackColor = {
    false: theme.colors.layout.border || '#ccc', 
    true: theme.colors.brand.primary
  };
  const thumbColor = Platform.OS === 'android' ? theme.colors.brand.primary : undefined;
  const iosBackgroundColor = theme.colors.layout.border || '#eee';

  return (
    <RNSwitch
      trackColor={trackColor}
      thumbColor={thumbColor}
      ios_backgroundColor={iosBackgroundColor}
      {...props} 
    />
  );
} 