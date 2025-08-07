import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/features/shared/context/ThemeContext';
import { Theme } from '@/features/shared/context/ThemeContext';
import { iconSizes } from '@/features/shared/theme/sizes';
import { paddings, borderRadii } from '@/features/shared/theme/spacing';

interface ScreenshotControlsProps {
  currentIndex: number;
  totalLoaded: number; // How many are currently loaded in the array
  totalCount: number | null; // Total available on server
  isLoadingMore: boolean;
  onGoBack: () => void; // Go to older item (higher index or load more)
  onGoForward: () => void; // Go to newer item (lower index)
}

export const ScreenshotControls: React.FC<ScreenshotControlsProps> = ({
  currentIndex,
  totalLoaded,
  totalCount,
  isLoadingMore,
  onGoBack,
  onGoForward,
}) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  // Determine disable states based on props
  // Disable "Back" (Older) if we are at the last loaded item AND not currently loading more
  // OR if totalCount exists and we are viewing the absolute oldest item (index matches totalCount - 1, adjusted)
  const isOldestLoaded = currentIndex === totalLoaded - 1;
  const isAbsoluteOldest = totalCount !== null && currentIndex === totalCount - 1; // Compare index to total-1

  const disableBack = isLoadingMore || (isOldestLoaded && isAbsoluteOldest);

  // Disable "Forward" (Newer) if we are at the first item (index 0)
  const disableForward = currentIndex === 0;

  // Calculate display index (1-based from total)
  const displayIndex = totalCount !== null ? totalCount - currentIndex : '?';
  const displayTotal = totalCount !== null ? totalCount : '?';

  return (
    <View style={styles.controlContainer}>
      {/* Left/Back Arrow (Older) */}
      <Pressable 
        style={styles.arrowButton} 
        onPress={onGoBack}
        disabled={disableBack}
      >
        <Ionicons 
          name="chevron-back-outline" 
          size={iconSizes.large} 
          color={disableBack ? theme.colors.text.disabled : theme.colors.text.primary} 
        />
      </Pressable>

      <View style={styles.indexIndicator}>
        <Text style={styles.indexText}>
          {`${displayIndex} / ${displayTotal}`}
        </Text>
      </View>

      {/* Right/Forward Arrow (Newer) */}
      <Pressable 
        style={styles.arrowButton} 
        onPress={onGoForward}
        disabled={disableForward}
      >
        <Ionicons 
          name="chevron-forward-outline" 
          size={iconSizes.large} 
          color={disableForward ? theme.colors.text.disabled : theme.colors.text.primary} 
        />
      </Pressable>
    </View>
  );
};

// Use styles similar to the original control containers
const getStyles = (theme: Theme) => StyleSheet.create({
  controlContainer: { 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: paddings.small, // Consistent padding
    marginTop: paddings.small,
    marginBottom: paddings.medium, // Consistent margin
  },
  arrowButton: {
    padding: paddings.small, // Clickable area
    opacity: 1,
  },
  indexIndicator: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: paddings.small,
    paddingVertical: 2,
    borderRadius: borderRadii.small,
    minWidth: 50,
    alignItems: 'center',
    marginHorizontal: paddings.medium,
  },
  indexText: {
    color: '#fff',
    fontSize: 12,
  },
}); 