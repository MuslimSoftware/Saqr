import React from 'react'
import { StyleSheet, TextStyle, View } from 'react-native'
import { BaseButton, BaseButtonProps } from './BaseButton'
import { ThemedText, TextVariant } from '../text' // Use ThemedText for flexibility
import { useTheme } from '@/features/shared/context/ThemeContext'

// Extend BaseButtonProps, adding icon and specific text props
export interface IconButtonProps extends Omit<BaseButtonProps, 'children'> {
  label: string
  icon?: React.ReactNode // Icon component (e.g., from vector-icons)
  iconPosition?: 'left' | 'right' // Optional: Where to place the icon
  textVariant?: TextVariant // Optional: Control text style
  textColor?: string // Optional: Override default text color
  textStyle?: TextStyle // Optional: Further text style overrides
  disabled?: boolean // Optional: Default disabled to false if not provided
}

export const IconButton = ({
  label,
  icon,
  iconPosition = 'left',
  variant = 'primary',
  textVariant = 'button',
  textColor, // Keep explicit textColor prop for overrides
  textStyle,
  style,
  disabled = false, // Default disabled to false if not provided
  ...props
}: IconButtonProps) => {
  const { theme } = useTheme()

  // Determine the effective variant for styling
  const effectiveVariant = disabled ? 'disabled' : variant

  // Determine text color: explicit prop > theme color for effective variant
  const finalTextColor =
    textColor ||
    theme.colors.button[effectiveVariant].text || // Use text color from effective variant
    theme.colors.text.primary // Fallback to primary text color if needed

  const textElement = (
    <ThemedText
      variant={textVariant}
      style={{ color: finalTextColor, ...textStyle }}
    >
      {label}
    </ThemedText>
  )

  const content = (
    <>
      {iconPosition === 'left' && icon}
      {textElement}
      {iconPosition === 'right' && icon}
    </>
  )

  return (
    // Pass the original variant and disabled props to BaseButton
    // BaseButton will handle applying the correct background/border
    <BaseButton variant={variant} style={style} disabled={disabled} {...props}>
      {content}
    </BaseButton>
  )
}
