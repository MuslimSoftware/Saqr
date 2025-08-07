import React from 'react';
import { View, StyleSheet } from 'react-native';
import { BaseLayoutComponentProps } from '@/features/shared/types';

// Use the shared prop type definition
export interface BaseRowProps extends BaseLayoutComponentProps {}

export function BaseRow({ style, gap, children, ...props }: BaseRowProps) {
  // Combine base styles, gap, and passed styles
  const combinedStyle = StyleSheet.flatten([
    styles.base,
    { gap: gap ?? 0 },
    style, 
  ]);

  return (
    <View 
      style={combinedStyle} 
      {...props} 
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    display: 'flex',
    flexDirection: 'row', // Core style for a row
    alignItems: 'center', // Default alignment, can be overridden by props.style
  },
}); 