import React, { useState, useEffect } from 'react'
import {
  StyleSheet,
  Platform,
  Keyboard,
  Animated,
  View,
  TouchableOpacity,
  KeyboardAvoidingView,
} from 'react-native'
import { router } from 'expo-router'

import { useTheme } from '@/features/shared/context/ThemeContext'
import { Ionicons } from '@expo/vector-icons'
import { BgView, MediumColumn, SmallRow } from '@/features/shared/components/layout'
import { TextHeader, TextBody, TextLink } from '@/features/shared/components/text'
import { PrimaryButton } from '@/features/shared/components/buttons'
import { paddings, gaps } from '@/features/shared/theme'
import { CAN_USE_NATIVE_DRIVER } from '@/features/shared'

interface AuthScreenLayoutProps {
  title: string
  subtitle: string
  children: React.ReactNode
  buttonText: string
  onButtonPress: () => void
  buttonDisabled?: boolean
}

export function AuthScreenLayout({
  title,
  subtitle,
  children,
  buttonText,
  onButtonPress,
  buttonDisabled = false,
}: AuthScreenLayoutProps) {
  const { theme } = useTheme()
  const buttonAnimation = new Animated.Value(1)
  const [keyboardVisible, setKeyboardVisible] = useState(false)

  useEffect(() => {
    const keyboardWillShow =
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow'
    const keyboardWillHide =
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide'

    const showSubscription = Keyboard.addListener(keyboardWillShow, () => {
      setKeyboardVisible(true)
      Animated.timing(buttonAnimation, {
        toValue: 0.3,
        duration: 250,
        useNativeDriver: CAN_USE_NATIVE_DRIVER,
      }).start()
    })

    const hideSubscription = Keyboard.addListener(keyboardWillHide, () => {
      setKeyboardVisible(false)
      Animated.timing(buttonAnimation, {
        toValue: 1,
        duration: 250,
        useNativeDriver: CAN_USE_NATIVE_DRIVER,
      }).start()
    })

    return () => {
      showSubscription.remove()
      hideSubscription.remove()
    }
  }, [])

  const handleBack = () => {
    router.back()
  }

  const screenPadding = paddings.medium ?? 24

  return (
    <BgView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons
            name="arrow-back"
            size={24}
            color={theme.colors.text.primary}
          />
        </TouchableOpacity>
      </View>

      {Platform.OS === 'ios' ? (
        <KeyboardAvoidingView
          behavior="padding"
          keyboardVerticalOffset={0}
          style={styles.content}
        >
          <View style={styles.formContainer}>
            <TextHeader style={styles.title}>{title}</TextHeader>
            <TextBody style={styles.subtitle}>{subtitle}</TextBody>

            {children}
          </View>

          <Animated.View
            style={[
              styles.buttonContainer,
              {
                transform: [
                  {
                    translateY: buttonAnimation.interpolate({
                      inputRange: [0.3, 1],
                      outputRange: [-20, 0],
                    }),
                  },
                ],
                opacity: buttonAnimation.interpolate({
                  inputRange: [0.3, 1],
                  outputRange: [1, 1],
                }),
              },
            ]}
          >
            <PrimaryButton
              label={buttonText}
              onPress={onButtonPress}
              disabled={buttonDisabled}
            />
          </Animated.View>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.content}>
          <View style={styles.formContainer}>
            <TextHeader style={styles.title}>{title}</TextHeader>
            <TextBody style={styles.subtitle}>{subtitle}</TextBody>

            {children}
          </View>

          <Animated.View
            style={[
              styles.buttonContainer,
              {
                transform: [
                  {
                    translateY: buttonAnimation.interpolate({
                      inputRange: [0.3, 1],
                      outputRange: [keyboardVisible ? -250 : 0, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            <PrimaryButton
              label={buttonText}
              onPress={onButtonPress}
              disabled={buttonDisabled}
            />
          </Animated.View>
        </View>
      )}
    </BgView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: paddings.medium,
    paddingBottom: paddings.medium,
  },
  backButton: {
    padding: paddings.medium,
    marginLeft: (paddings.medium ?? 0) * -1,
  },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
    paddingHorizontal: paddings.medium,
    marginTop: gaps.medium,
  },
  formContainer: {},
  title: {
    marginBottom: gaps.medium,
  },
  subtitle: {
    marginBottom: gaps.medium,
  },
  buttonContainer: {
    ...(Platform.OS === 'ios'
      ? {
          flex: 1,
          justifyContent: 'flex-end',
          minHeight: 120,
          paddingBottom: 50,
        }
      : {
          position: 'absolute',
          bottom: paddings.medium,
          width: '100%',
          maxWidth: 500,
          alignSelf: 'center',
          paddingHorizontal: paddings.medium,
        }),
  },
})
