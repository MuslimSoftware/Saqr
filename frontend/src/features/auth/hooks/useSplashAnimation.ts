import { useEffect, useRef, useCallback } from 'react'
import { Animated } from 'react-native'
import { router } from 'expo-router'
import { CAN_USE_NATIVE_DRIVER } from '@/features/shared/utils'

export function useSplashAnimation() {
  const scaleAnim = useRef(new Animated.Value(0.3)).current
  const opacityAnim = useRef(new Animated.Value(0)).current
  const breatheAnim = useRef(new Animated.Value(1)).current

  // Refs for controlling flow and state
  const isMountedRef = useRef(true)
  const isLoadingCompleteRef = useRef(false)
  const isAuthenticatedRef = useRef(false)
  const currentAnimationRef = useRef<Animated.CompositeAnimation | null>(null)

  // Initial fade-in and scale-up animation
  const initialAnimationRef = useRef(
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 20,
        friction: 2,
        useNativeDriver: CAN_USE_NATIVE_DRIVER,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: CAN_USE_NATIVE_DRIVER,
      }),
    ])
  ).current

  // Single breathing cycle animation (inhale/exhale)
  const createBreathingAnimation = useCallback(() => {
    return Animated.sequence([
      Animated.timing(breatheAnim, {
        toValue: 1.1,
        duration: 1000,
        useNativeDriver: CAN_USE_NATIVE_DRIVER,
      }),
      Animated.timing(breatheAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: CAN_USE_NATIVE_DRIVER,
      }),
    ])
  }, [breatheAnim])
  
  // Triggers navigation and hides splash screen - always go to chat in demo mode
  const triggerFinalNavigation = useCallback(() => {
    if (!isMountedRef.current) return
    try {
      // Always redirect to chat in demo mode
      router.replace('/(main)/chat')
    } catch (error) {
      console.error("Navigation error:", error)
      router.replace('/(main)/chat')
    }
  }, [])

  // Runs a single breathing cycle and decides whether to loop or finish
  const runBreathingCycle = useCallback(() => {
    if (!isMountedRef.current) {
      return
    }
    currentAnimationRef.current = createBreathingAnimation()
    currentAnimationRef.current.start(({ finished }) => {
      if (!finished || !isMountedRef.current) {
        return
      }
      
      if (isLoadingCompleteRef.current) {
        triggerFinalNavigation()
      } else {
        runBreathingCycle()
      }
    })
  }, [createBreathingAnimation, triggerFinalNavigation])

  // In demo mode, always consider user as "authenticated" (will redirect to chat)
  const checkAuthStatus = useCallback(async (): Promise<boolean> => {
    // Always authenticated in demo mode
    isAuthenticatedRef.current = true
    return true
  }, [])

  // Main effect coordinating the animation and loading
  useEffect(() => {
    isMountedRef.current = true
    initialAnimationRef.start(() => {
      if (!isMountedRef.current) return
      runBreathingCycle()

      checkAuthStatus()
        .then(() => {
          if (!isMountedRef.current) return
          isLoadingCompleteRef.current = true
        })
        .catch((error) => {
          if (!isMountedRef.current) return
          console.error("[SplashAnimation] Font loading or auth check failed:", error)
          isLoadingCompleteRef.current = true
          triggerFinalNavigation()
        })
    })

    // Cleanup function
    return () => {
      isMountedRef.current = false
      initialAnimationRef.stop()
      currentAnimationRef.current?.stop()
    }
  }, [initialAnimationRef, runBreathingCycle, checkAuthStatus, triggerFinalNavigation])

  return {
    animatedStyle: {
      opacity: opacityAnim,
      transform: [
        { scale: Animated.multiply(scaleAnim, breatheAnim) }
      ],
    },
  }
} 