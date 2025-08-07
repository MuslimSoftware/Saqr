import React from 'react'
import { View, StyleSheet, ViewProps, ViewStyle } from 'react-native'
import { paddings } from '@/features/shared/theme/spacing'

interface PageViewProps extends ViewProps {
  children: React.ReactNode
  style?: ViewStyle
}

export const PageView = ({ children, style, ...props }: PageViewProps) => {
  return (
    <View style={[styles.container, style]} {...props}>
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: paddings.medium,
    flex: 1,
  },
})
