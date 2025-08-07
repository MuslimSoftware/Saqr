import React from 'react'
import { StyleSheet, View, Animated, Dimensions, Image } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useTheme } from '@/features/shared/context/ThemeContext'

export const LOGO_SIZE = 160
export const LOGO_TO_TITLE_SPACING = 5
export const INITIAL_POSITION = 0.4 // 40% from top
export const FINAL_POSITION = 0.2 // 20% from top

interface AnimatedLogoProps {
  animatedStyle?: any
}

export function AnimatedLogo({ animatedStyle }: AnimatedLogoProps) {
  const { theme } = useTheme()

  const logoSource = theme.mode === 'dark' ? require('@/assets/images/logo_light.png') : require('@/assets/images/logo_dark.png')
  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Image
        source={logoSource}
        style={styles.logo}
      />
    </Animated.View>
  )
}

// Only offset by half the logo size to center it
const baseTransform = -(LOGO_SIZE / 2.5)

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: `${INITIAL_POSITION * 100}%`,
    alignItems: 'center',
    transform: [{ translateY: baseTransform }],
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
  },
})
