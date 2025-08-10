// frontend/app.config.ts
const path = require('path');
const dotenv = require('dotenv');

// --- Configuration Loading --- 
// Prefer EXPO_PUBLIC_* (Docker/Expo web builds), fallback to legacy names for local dev
const ENV = process.env.EXPO_PUBLIC_APP_ENV || process.env.APP_ENV || 'development';
dotenv.config({ path: path.resolve(__dirname, '.env') }); // Load root .env
dotenv.config({ path: path.resolve(__dirname, `.env.${ENV}`), override: true }); // Load specific env

// Read needed values directly from process.env
const brandName = process.env.EXPO_PUBLIC_BRAND_NAME || process.env.BRAND_NAME || 'DefaultAppName';
const brandSlug = process.env.EXPO_PUBLIC_BRAND_SLUG || process.env.BRAND_SLUG || 'default-app-slug';
const apiUrl = process.env.EXPO_PUBLIC_API_URL || process.env.FE_API_URL;

// --- Expo Config Export --- 
import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  
  // Build the 'extra' object for runtime access
  const extraConfig = {
    env: ENV,
    FE_API_URL: apiUrl, // Pass the value read from process.env
    BRAND_NAME: brandName,
    BRAND_SLUG: brandSlug,
    eas: {
      projectId: 'your-project-id' // Replace if needed
    }
  };

  return {
    name: `${brandName} (demo)`,
    slug: brandSlug,
    version: '1.0.0',
    orientation: 'portrait',
    icon: './src/assets/images/splash-icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './src/assets/images/splash-icon.png',
      resizeMode: 'contain',
      backgroundColor: '#ffffff'
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.yourusername.' + brandSlug, // Update if needed
      infoPlist: {
        NSAppTransportSecurity: {
          NSAllowsArbitraryLoads: ENV === 'development'
        }
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './src/assets/images/adaptive-icon.png',
        backgroundColor: '#ffffff'
      },
      package: 'com.yourusername.' + brandSlug, // Update if needed
    },
    web: {
      favicon: './src/assets/images/logo_light_icon.png',
      bundler: 'metro'
    },
    plugins: ['expo-router', 'expo-secure-store'],
    experiments: {
      typedRoutes: true
    },
    scheme: brandSlug,
    extra: extraConfig,
    updates: {
      fallbackToCacheTimeout: 0
    },
    newArchEnabled: true,
  };
}; 