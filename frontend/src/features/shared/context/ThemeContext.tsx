import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  useCallback,
} from 'react'
import { useColorScheme } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useFonts } from 'expo-font'
import * as SplashScreen from 'expo-splash-screen'
import { IS_NATIVE } from '@/features/shared/utils'
import { Theme, lightTheme, darkTheme } from '@/features/shared/theme'
import { ThemePreference, ThemeContextType } from '@/features/shared/types'

const ASYNC_STORAGE_KEY = 'userThemePreference'


const defaultContextValue: ThemeContextType = {
  theme: lightTheme, // Default to light initially
  isDark: false,
  themePreference: 'system', // Default preference
  setThemePreference: () => { console.warn('ThemeProvider not mounted') },
}

const ThemeContext = createContext<ThemeContextType>(defaultContextValue)

export const useTheme = () => useContext(ThemeContext)

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const systemColorScheme = useColorScheme()
  const [themePreference, _setThemePreference] = useState<ThemePreference>('system')
  const [isPreferenceLoaded, setIsPreferenceLoaded] = useState(false)

  // --- Font Loading --- 
  const [fontsLoaded, fontError] = useFonts({
    'Roboto-Regular': require('@/assets/fonts/Roboto-Regular.ttf'),
    'Roboto-Medium': require('@/assets/fonts/Roboto-Medium.ttf'),
    'Roboto-Bold': require('@/assets/fonts/Roboto-Bold.ttf'),
    'Roboto-Light': require('@/assets/fonts/Roboto-Light.ttf'),
  });
  const fontsReady = fontsLoaded || !!fontError; // Consider fonts ready if loaded or if there was an error
  // ---------------------

  // Load preference from storage on mount
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const storedPreference = await AsyncStorage.getItem(ASYNC_STORAGE_KEY)
        if (storedPreference && ['light', 'dark', 'system'].includes(storedPreference)) {
          _setThemePreference(storedPreference as ThemePreference)
        }
      } catch (e) {
        console.error("Failed to load theme preference:", e)
      } finally {
        setIsPreferenceLoaded(true)
      }
    }
    loadPreference()
  }, [])

  // Function to update preference state and storage
  const setThemePreference = useCallback(async (preference: ThemePreference) => {
    _setThemePreference(preference)
    try {
      await AsyncStorage.setItem(ASYNC_STORAGE_KEY, preference)
    } catch (e) {
      console.error("Failed to save theme preference:", e)
    }
  }, [])

  // Determine the effective scheme based on preference and system setting
  const effectiveColorScheme = useMemo(() => {
    if (!isPreferenceLoaded) return systemColorScheme ?? 'light' // Use system before loaded
    return themePreference === 'system' ? systemColorScheme ?? 'light' : themePreference
  }, [themePreference, systemColorScheme, isPreferenceLoaded])

  const isDark = effectiveColorScheme === 'dark'
  
  const theme = useMemo(() => {
    return isDark ? darkTheme : lightTheme
  }, [isDark, themePreference, systemColorScheme])

  const contextValue = useMemo(() => ({
    theme,
    isDark,
    themePreference,
    setThemePreference,
  }), [theme, isDark, themePreference, setThemePreference])

  if (!fontsReady || !isPreferenceLoaded) {
    return null; 
  }
  
  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

// Export the Theme type itself
export type { Theme }
