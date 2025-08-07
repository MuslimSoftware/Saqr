import React from 'react';
import { ViewProps, StyleProp, ViewStyle } from 'react-native';

/**
 * Base properties shared by layout components like Row and Column.
 */
export interface BaseLayoutProps {
  children?: React.ReactNode; // Make children optional as ViewProps doesn't require it
  gap?: number; // Optional gap between items (applied by component)
  style?: StyleProp<ViewStyle>; // Allow style overrides
}

/**
 * Combined type for base layout components extending ViewProps.
 */
export type BaseLayoutComponentProps = BaseLayoutProps & Omit<ViewProps, 'style'>;
// Omit<ViewProps, 'style'> prevents conflict as style is in BaseLayoutProps 