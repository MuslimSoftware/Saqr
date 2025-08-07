export const iconSizes = {
  xxsmall: 12,
  xsmall: 16,
  small: 20,
  medium: 24,
  large: 32,
  xlarge: 40,
  xxlarge: 48,
};

// Optional: Add other size constants here as needed
// export const avatarSizes = { ... };
// export const buttonHeights = { ... };

// Optional: Define a type for the theme structure if you integrate this into the main Theme type
export type ThemeSizes = {
  iconSizes: typeof iconSizes;
  // avatarSizes?: typeof avatarSizes;
  // buttonHeights?: typeof buttonHeights;
}; 