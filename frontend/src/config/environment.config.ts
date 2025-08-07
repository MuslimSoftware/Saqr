import Constants from 'expo-constants';

export type Environment = 'development' | 'staging' | 'production';

export interface EnvironmentConfig {
  env: Environment;
  FE_API_URL: string;
  BRAND_NAME: string;
  BRAND_SLUG: string;
  eas?: {
    projectId?: string;
  };
}

// Helper function to safely access the extra config and validate
function loadAndValidateConfig(): EnvironmentConfig {
  const extra = Constants.expoConfig?.extra ?? {};

  const env = extra.env ?? 'development';
  if (!['development', 'staging', 'production'].includes(env)) {
    throw new Error(`Invalid environment specified: ${env}`);
  }

  const FE_API_URL = extra.FE_API_URL;
  if (!FE_API_URL) {
    throw new Error('FE_API_URL is not configured in environment variables.');
  }

  const config: EnvironmentConfig = {
    env: env as Environment,
    FE_API_URL: FE_API_URL,
    BRAND_NAME: extra.BRAND_NAME ?? 'DefaultAppName',
    BRAND_SLUG: extra.BRAND_SLUG ?? 'default-app-slug',
    eas: extra.eas,
  };

  return config;
}

// Load, validate, and export the config immediately
export const config: EnvironmentConfig = loadAndValidateConfig();

// Optional: Helper functions for environment checks (similar to the old index.ts)
export const isDev = (): boolean => config.env === 'development';
export const isStaging = (): boolean => config.env === 'staging';
export const isProd = (): boolean => config.env === 'production'; 