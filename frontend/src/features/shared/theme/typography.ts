type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900

type TypographyStyle = {
    fontFamily: string;
    fontSize: number;
    fontWeight: FontWeight;
    lineHeight: number;
}

export type Typography = {
    h1: TypographyStyle;
    h2: TypographyStyle;
    h3: TypographyStyle;
    h4: TypographyStyle;
    h5: TypographyStyle;
    h6: TypographyStyle;
    body1: TypographyStyle;
    body2: TypographyStyle;
    button: TypographyStyle;
    caption: TypographyStyle;
}

export const typography: Typography = {
    h1: {
        fontFamily: 'Roboto',
        fontSize: 32,
        fontWeight: 700,
        lineHeight: 40,
    },
    h2: {
        fontFamily: 'Roboto',
        fontSize: 24,
        fontWeight: 700,
        lineHeight: 32,
    },
    h3: {
        fontFamily: 'Roboto',
        fontSize: 20,
        fontWeight: 700,
        lineHeight: 28,
    },
    h4: {
        fontFamily: 'Roboto',
        fontSize: 16,
        fontWeight: 700,
        lineHeight: 24,
    },
    h5: {
        fontFamily: 'Roboto',
        fontSize: 14,
        fontWeight: 700,
        lineHeight: 20,
    },
    h6: {
        fontFamily: 'Roboto',
        fontSize: 12,
        fontWeight: 700,
        lineHeight: 16,
    },
    body1: {
        fontFamily: 'Roboto',
        fontSize: 16,
        fontWeight: 400,
        lineHeight: 24,
    },
    body2: {
        fontFamily: 'Roboto',
        fontSize: 14,
        fontWeight: 400,
        lineHeight: 20,
    },
    button: {
        fontFamily: 'Roboto',
        fontSize: 16,
        fontWeight: 500,
        lineHeight: 24,
    },
    caption: {
        fontFamily: 'Roboto',
        fontSize: 12,
        fontWeight: 400,
        lineHeight: 16,
    }
}