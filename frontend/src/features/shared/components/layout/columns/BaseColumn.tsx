import React from 'react'
import { View, StyleSheet } from 'react-native'
import { BaseLayoutComponentProps } from '@/features/shared/types'

// Use the shared prop type definition
export interface BaseColumnProps extends BaseLayoutComponentProps {}

export const BaseColumn: React.FC<BaseColumnProps> = ({
  children,
  gap, // Gap might be undefined now, provide a default or handle it
  style,
  ...props
}) => {
  // Combine the gap style with any passed styles
  const combinedStyle = StyleSheet.flatten([
    { gap: gap ?? 0 }, // Apply gap if provided, default to 0
    style,
  ])

  return (
    <View style={combinedStyle} {...props}>
      {children}
    </View>
  )
}
