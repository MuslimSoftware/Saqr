// --- Padding Values ---
export const paddings = {
  none: 0,
  xxsmall: 2,
  xsmall: 4,
  small: 8,
  base: 12,
  medium: 16,
  large: 24,
  xlarge: 32,
  xxlarge: 64,
};

// --- Gap Values ---
export const gaps = {
  none: 0,
  xxsmall: 2,
  xsmall: 4,
  small: 8,
  medium: 16,
  large: 24,
  xlarge: 32,
  xxlarge: 64,
};

// --- Border Radius Values ---
export const borderRadii = {
  none: 0,
  small: 4,
  medium: 8,
  large: 16,
  xlarge: 24,
  xxlarge: 32,
  round: 9999,
};

// Optional: Type definition for documentation or theme integration
export type ThemeSpacing = {
  paddings: typeof paddings;
  gaps: typeof gaps;
  borderRadii: typeof borderRadii;
};

type SpacingValue = {
    gap: number;
    padding: number;
    borderRadius: number;
}

export type Spacing = {
    section: SpacingValue;
    list: {
        gap?: number;
        borderRadius?: number;
        item: SpacingValue;
    }
    card: SpacingValue;
    button: SpacingValue;
    input: SpacingValue;
    select: SpacingValue;
}

export const spacing: Spacing = {
    section: {
        gap: gaps.medium,
        padding: paddings.medium,
        borderRadius: borderRadii.medium,
    },
    list: {
        gap: gaps.medium,
        borderRadius: borderRadii.medium,
        item: {
            gap: gaps.medium,
            padding: paddings.medium,
            borderRadius: borderRadii.medium,
        },
    },
    card: {
        padding: paddings.medium,
        borderRadius: borderRadii.medium,
        gap: gaps.medium,
    },
    button: {
        padding: paddings.medium,
        borderRadius: borderRadii.xlarge,
        gap: gaps.medium,
    },
    input: {
        padding: paddings.medium,
        borderRadius: borderRadii.medium,
        gap: gaps.medium,
    },
    select: {
        padding: paddings.medium,
        borderRadius: borderRadii.medium,
        gap: gaps.medium,
    },
} 