import React from 'react';
import { gaps } from '@/features/shared/theme/spacing';
import { BaseRow, BaseRowProps } from './BaseRow';
import { StyleSheet } from 'react-native';

export interface LargeRowProps extends BaseRowProps {}

/**
 * A row component applying a large gap by default.
 */
export function LargeRow({ style, ...props }: LargeRowProps) {
  return (
    <BaseRow 
      gap={gaps.large} // Apply default large gap
      style={style} 
      {...props} 
    />
  );
} 