import React, { useRef, useState, useEffect } from 'react'
import { View, TextInput, StyleSheet, Pressable, Animated } from 'react-native'
import { useTheme } from '@/features/shared/context/ThemeContext'
import {
  TextCaption,
  TextHeader,
  TextHeaderThree,
} from '@/features/shared/components/text'
import { gaps, borderRadii } from '@/features/shared/theme'
import { SmallRow } from '@/features/shared/components/layout'
import { CAN_USE_NATIVE_DRIVER } from '@/features/shared/utils/platform'

interface OtpInputProps {
  value: string
  onChangeText: (text: string) => void
  digitCount?: number
  error?: boolean
  errorMessage?: string | null
  // Add other necessary props like onSubmitEditing if needed
}

export const OtpInput: React.FC<OtpInputProps> = ({
  value,
  onChangeText,
  digitCount = 6,
  error = false,
  errorMessage = null,
}) => {
  const { theme } = useTheme()
  const inputRef = useRef<TextInput>(null)
  const [isFocused, setIsFocused] = useState(false)
  const cursorOpacity = useRef(new Animated.Value(0)).current

  const handlePress = () => {
    inputRef.current?.focus()
  }

  const handleFocus = () => setIsFocused(true)
  const handleBlur = () => setIsFocused(false)

  // Blinking cursor animation
  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null
    if (isFocused) {
      // Start blinking instantly
      cursorOpacity.setValue(1) // Ensure it starts visible
      animation = Animated.loop(
        Animated.sequence([
          // Stay visible for 500ms
          Animated.delay(500),
          // Instantly disappear
          Animated.timing(cursorOpacity, {
            toValue: 0,
            duration: 0, // Instant change
            useNativeDriver: CAN_USE_NATIVE_DRIVER,
          }),
          // Stay invisible for 500ms
          Animated.delay(500),
          // Instantly appear
          Animated.timing(cursorOpacity, {
            toValue: 1,
            duration: 0, // Instant change
            useNativeDriver: CAN_USE_NATIVE_DRIVER,
          }),
        ]),
      )
      animation.start()
    } else {
      cursorOpacity.setValue(0) // Ensure hidden when not focused
    }

    return () => {
      // Cleanup animation
      if (animation) {
        animation.stop()
      }
      cursorOpacity.setValue(0)
    }
  }, [isFocused, cursorOpacity])

  // Create an array based on digitCount for mapping
  const digits = Array.from({ length: digitCount })

  return (
    <View style={styles.container}>
      {/* Hidden TextInput */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        maxLength={digitCount}
        keyboardType="number-pad"
        autoFocus={true}
        caretHidden
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={styles.hiddenInput}
      />

      {/* Display Boxes */}
      <Pressable style={styles.displayContainer} onPress={handlePress}>
        <SmallRow>
          {digits.map((_, index) => {
            const digit = value[index] || ''
            const isCurrentDigit = index === value.length
            const isActive = isFocused && isCurrentDigit

          const boxStyle = [
            styles.box,
            {
              borderColor: error
                ? theme.colors.indicators.error
                : isActive
                  ? theme.colors.text.primary
                  : theme.colors.layout.border,
              backgroundColor: theme.colors.layout.foreground,
            },
          ]

          return (
            <View key={index} style={boxStyle}>
              <TextHeaderThree
                style={[styles.boxText, { color: theme.colors.text.primary }]}
              >
                {digit}
              </TextHeaderThree>
              {isActive && (
                <Animated.View
                  style={[
                    styles.cursor,
                    {
                      opacity: cursorOpacity,
                      backgroundColor: theme.colors.text.primary,
                    },
                  ]}
                />
              )}
            </View>
          )
        })}
        </SmallRow>
      </Pressable>

      {/* Conditionally render the error message */}
      {errorMessage ? (
        <TextCaption
          color={theme.colors.indicators.error}
          style={styles.errorText}
        >
          {errorMessage}
        </TextCaption>
      ) : null}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    alignItems: 'center', // Center the display container
  },
  hiddenInput: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  displayContainer: {
    width: '100%',
    justifyContent: 'center', // Center the row of boxes
  },
  box: {
    flex: 1, // Allow boxes to share space
    maxWidth: gaps.xxlarge + gaps.small, // Use gaps constants
    aspectRatio: 1,
    borderWidth: 1,
    borderRadius: borderRadii.medium, // Use borderRadii constant
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxText: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  cursor: {
    position: 'absolute',
    width: 2,
    height: '40%',
  },
  errorText: {
    marginTop: gaps.small, // Use gaps constant
    textAlign: 'left', // Align text to the left below the inputs
    width: '100%', // Take full width
  },
})
