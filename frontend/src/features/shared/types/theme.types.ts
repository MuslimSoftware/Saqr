import { Theme } from '../theme/theme';

// Define the possible preference values
export type ThemePreference = 'light' | 'dark' | 'system';

// Define the shape of the Theme Context
export type ThemeContextType = {
  theme: Theme; 
  isDark: boolean; 
  themePreference: ThemePreference; 
  setThemePreference: (preference: ThemePreference) => void;
}; 