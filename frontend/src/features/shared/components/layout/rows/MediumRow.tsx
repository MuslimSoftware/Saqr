import React from 'react';
import { StyleSheet } from 'react-native';
import { BaseRow, BaseRowProps } from './BaseRow';
import { gaps } from '@/features/shared/theme/spacing';

// Extend BaseRowProps if MediumRow needs specific additional props
export interface MediumRowProps extends BaseRowProps {}

/**
 * A standard row component applying a medium gap by default.
 */
export function MediumRow({ style, ...props }: MediumRowProps) {
  return (
    <BaseRow 
      // Apply default medium gap unless a specific gap is passed in props
      gap={gaps.medium} 
      style={style} // Pass through other styles
      {...props} 
    />
  );
} 