import { Platform } from 'react-native';

/**
 * Flag indicating if the current platform is web.
 */
export const IS_WEB = Platform.OS === 'web';

/**
 * Flag indicating if the current platform is native (iOS or Android).
 */
export const IS_NATIVE = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Flag indicating if the Animated API should use the native driver.
 * This is generally true for native platforms and false for web.
 */
export const CAN_USE_NATIVE_DRIVER = IS_NATIVE;

// Add other platform-specific constants or helpers as needed. 