import React from 'react';
import { BaseRow, BaseRowProps } from './BaseRow';
import { gaps } from '@/features/shared/theme';

export interface SmallRowProps extends BaseRowProps {}

/**
 * A row component applying a small gap by default.
 */
export function SmallRow({ style, ...props }: SmallRowProps) {
  return (
    <BaseRow 
      gap={gaps.small} // Apply default small gap
      style={style} 
      {...props} 
    />
  );
} 