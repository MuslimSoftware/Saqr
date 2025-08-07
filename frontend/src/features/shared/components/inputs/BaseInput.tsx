import React from 'react'
import {
  TextInput,
  View,
  StyleSheet,
  TextInputProps,
  ViewStyle,
  StyleProp,
  TextStyle,
} from 'react-native'
import { useTheme } from '@/features/shared/context/ThemeContext'
import { borderRadii } from '@/features/shared/theme/spacing'
import { typography } from '@/features/shared/theme'

interface BaseInputProps extends Omit<TextInputProps, 'style'> {
  inputStyle?: StyleProp<TextStyle>
  containerStyle?: ViewStyle
  error?: boolean
  label?: string
}

export const BaseInput: React.FC<BaseInputProps> = ({
  inputStyle,
  containerStyle,
  error,
  label,
  ...props
}) => {
  const { theme } = useTheme()

  const computedInputStyles = [
    styles.input,
    {
      backgroundColor: theme.colors.layout.background,
      color: theme.colors.text.primary,
      borderColor: error
        ? theme.colors.indicators.error
        : theme.colors.layout.background,
    },
    inputStyle,
  ]

  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        style={computedInputStyles}
        placeholderTextColor={theme.colors.text.secondary}
        {...props}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadii.medium,
    fontSize: typography.body1.fontSize,
    textAlignVertical: 'center',
    lineHeight: 25,
  },
})
