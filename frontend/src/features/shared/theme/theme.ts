import { typography, Typography } from './typography';
import { spacing, Spacing } from './spacing';
import { Colors } from './colors';

// --- Types (Keep internal definitions or move to theme.types.ts if preferred) --- 
type ButtonStyle = {
    background: string;
    border: string;
    text: string;
}

type ThemeColors = {
    brand: {
        primary: string;
        secondary: string;
        tertiary: string;
    }
    layout: {
        background: string;
        foreground: string;
        border: string;
    }
    indicators: {
        error: string;
        warning: string;
        info: string;
        success: string;
        loading: string;
    }
    text: {
        primary: string;
        secondary: string;
        disabled: string;
    }
    button: {
        primary: ButtonStyle;
        secondary: ButtonStyle;
        disabled: ButtonStyle;
    }
}

// Base Theme Type
export type Theme = {
    mode: 'light' | 'dark';
    colors: ThemeColors;
    typography: Typography;
    spacing: Spacing;
}

// --- Base Theme Object --- 
const baseTheme = {
    typography: typography,
    spacing: spacing,
}

// --- Exported Themes --- 
export const lightTheme: Theme = {
    mode: 'light',
    colors: {
        brand: {
            primary: Colors.primary.light,
            secondary: Colors.secondary.light,
            tertiary: Colors.tertiary.light,
        },
        layout: {
            background: Colors.gray50,
            foreground: Colors.gray100,
            border: Colors.gray100,
        },
        indicators: {
            error: Colors.red500,
            warning: Colors.yellow500,
            info: Colors.blue500,
            success: Colors.green500,
            loading: Colors.gray600,
        },
        text: {
            primary: Colors.gray900,
            secondary: Colors.gray600,
            disabled: Colors.gray400,
        },
        button: {
            primary: {
                background: Colors.primary.light,
                border: Colors.primary.light,
                text: Colors.gray50,
            },
            secondary: {
                background: Colors.secondary.light,
                border: Colors.secondary.light,
                text: Colors.gray900,
            },
            disabled: {
                background: Colors.gray200,
                border: Colors.gray200,
                text: Colors.gray500,
            }
        },
    },
    ...baseTheme,
}

export const darkTheme: Theme = {
    mode: 'dark',
    colors: {
        brand: {
            primary: Colors.primary.dark,
            secondary: Colors.secondary.dark,
            tertiary: Colors.tertiary.dark,
        },
        layout: {
            background: Colors.gray900,
            foreground: Colors.gray800,
            border: Colors.gray800,
        },
        indicators: {
            error: Colors.red500,
            warning: Colors.yellow500,
            info: Colors.blue500,
            success: Colors.green500,
            loading: Colors.gray600,
        },
        text: {
            primary: Colors.gray50,
            secondary: Colors.gray400,
            disabled: Colors.gray600,
        },
        button: {
            primary: {
                background: Colors.primary.dark,
                border: Colors.primary.dark,
                text: Colors.gray50,
            },
            secondary: {
                background: Colors.secondary.dark,
                border: Colors.secondary.dark,
                text: Colors.gray50,
            },
            disabled: {
                background: Colors.gray700,
                border: Colors.gray700,
                text: Colors.gray200,
            }
        },
    },
    ...baseTheme,
} 