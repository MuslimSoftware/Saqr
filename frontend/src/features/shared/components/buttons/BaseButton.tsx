import {
  TouchableOpacity,
  TouchableOpacityProps,
  StyleSheet,
  StyleProp,
  ViewStyle,
  ColorValue,
  ViewProps,
} from 'react-native'
import { useTheme } from '@/features/shared/context/ThemeContext'
import { paddings, borderRadii, gaps } from '@/features/shared/theme/spacing'
import React from 'react'
import { MediumRow } from '@/features/shared/components/layout'
import { TextButtonLabel } from '../text'

export interface BaseButtonProps
  extends Omit<TouchableOpacityProps, 'children' | 'style'> {
  children: React.ReactNode
  variant?: 'primary' | 'secondary'
  disabled?: boolean
  style?: StyleProp<ViewStyle>
  pointerEvents?: ViewProps['pointerEvents']
}

export const BaseButton = ({
  children,
  variant = 'primary',
  disabled = false,
  style,
  pointerEvents,
  ...restProps
}: BaseButtonProps) => {
  const { theme } = useTheme()

  // Determine the effective variant based on the disabled state
  const effectiveVariant = disabled ? 'disabled' : variant

  // Get colors from the theme using the effective variant
  const buttonThemeStyles = theme.colors.button[effectiveVariant]

  const buttonStyle: StyleProp<ViewStyle> = [
    {
      // Use colors from the determined variant (primary, secondary, or disabled)
      backgroundColor: buttonThemeStyles.background as ColorValue,
      borderColor: buttonThemeStyles.border as ColorValue,
      borderWidth: 1, // Ensure border is visible
      padding: paddings.base,
      borderRadius: borderRadii.xxlarge,
    },
    style,
    pointerEvents ? { pointerEvents } : {},
  ]

  return (
    <TouchableOpacity
      style={buttonStyle}
      disabled={disabled}
      activeOpacity={0.8}
      {...restProps}
    >
      <MediumRow style={styles.contentContainer}>
        {children}
      </MediumRow>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  contentContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
})
