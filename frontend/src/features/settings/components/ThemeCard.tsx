import React from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { TextBody } from '@/features/shared/components/text';
import { FgView, SmallRow } from '@/features/shared/components/layout';
import { Ionicons } from '@expo/vector-icons';
import { iconSizes, Theme, gaps, paddings, borderRadii } from '@/features/shared/';

type ThemeCardProps = {
  theme: Theme;
  isThemeDark: boolean;
  isSelected: boolean;
  onPress: () => void;
};

export function ThemeCard({ theme, isThemeDark, isSelected, onPress }: ThemeCardProps) {
  // Determine name based on the passed prop
  const themeName = isThemeDark ? 'Dark' : 'Light';

  return (
    <Pressable onPress={onPress} style={styles.pressableContainer}>
      {({ pressed }) => (
        <FgView 
          style={{
            ...styles.card,
            backgroundColor: theme.colors.layout.foreground,
            borderColor: isSelected ? theme.colors.brand.primary : theme.colors.layout.border,
            opacity: pressed ? 0.8 : 1,
          }}
        >
          {/* Color Swatches */}
          <SmallRow style={styles.swatchContainer}>
            <View style={[styles.swatch, { backgroundColor: theme.colors.brand.primary }]} />
            <View style={[styles.swatch, { backgroundColor: theme.colors.layout.background }]} />
            <View style={[styles.swatch, { backgroundColor: theme.colors.text.primary }]} />
          </SmallRow>

          {/* Theme Name and Selection Indicator */}
          <View style={styles.footer}>
            <TextBody style={{ color: theme.colors.text.primary }}>{themeName}</TextBody>
            {isSelected && (
              <Ionicons 
                name="checkmark-circle"
                size={iconSizes.medium}
                color={theme.colors.brand.primary} 
              />
            )}
          </View>
        </FgView>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressableContainer: {
    flex: 1, // Allow cards to grow and share space
  },
  card: {
    borderRadius: borderRadii.large,
    borderWidth: 2,
    padding: paddings.medium,
    gap: gaps.medium,
    overflow: 'hidden',
  },
  swatchContainer: {
    height: 40,
    width: '100%',
  },
  swatch: {
    flex: 1,
    borderRadius: borderRadii.small,
    height: '100%',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: gaps.small,
  },
}); 