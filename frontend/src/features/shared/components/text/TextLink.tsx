import React from 'react'
import { TextStyle } from 'react-native' // Import TextStyle
import { ThemedText, ThemedTextProps } from './ThemedText' // Import full props

// Use ThemedTextProps directly to allow variant override
export const TextLink = ({
  variant = 'caption', // Default variant
  style,
  ...props
}: ThemedTextProps) => {
  const underlineStyle: TextStyle = {
    textDecorationLine: 'underline',
  }

  return (
    <ThemedText
      variant={variant}
      style={[underlineStyle, style]} // Combine styles
      {...props}
    />
  )
}
