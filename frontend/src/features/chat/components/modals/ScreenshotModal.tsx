import React from 'react';
import { Modal, View, Image, StyleSheet, Pressable, Dimensions, Text, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, Theme } from '@/features/shared/context/ThemeContext';
import { iconSizes } from '@/features/shared/theme/sizes';
import { paddings } from '@/features/shared/theme/spacing';
import { borderRadii } from '@/features/shared/theme/spacing';
import { ScreenshotData } from '@/api/types/chat.types';

interface ScreenshotModalProps {
  isVisible: boolean;
  screenshots: ScreenshotData[];
  onClose: () => void;
  currentIndex: number;
  totalLoaded: number;
  totalCount: number | null;
  onGoBack: () => void;
  onGoForward: () => void;
  loadingMoreScreenshots: boolean;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const ScreenshotModal: React.FC<ScreenshotModalProps> = ({
  isVisible,
  screenshots,
  onClose,
  currentIndex,
  totalLoaded,
  totalCount,
  onGoBack,
  onGoForward,
  loadingMoreScreenshots,
}) => {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const currentImageUri = screenshots?.[currentIndex]?.image_data;

  if (!currentImageUri) {
    return null;
  }

  const displayIndex = totalCount !== null ? totalCount - currentIndex : currentIndex + 1;
  const displayTotal = totalCount ?? totalLoaded;

  const canGoBack = totalCount !== null ? (displayIndex > 1) : (currentIndex < totalLoaded - 1);
  const canGoForward = currentIndex > 0;

  return (
    <Modal
      animationType="fade"
      transparent={true}
      visible={isVisible}
      onRequestClose={onClose}
    >
      <Pressable style={styles.centeredView} onPress={onClose}>
        <View style={styles.modalView}>
          <Pressable style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close-circle" size={iconSizes.xlarge} color={theme.colors.text.secondary} />
          </Pressable>
          <View style={styles.imageContainer}>
            {loadingMoreScreenshots || !currentImageUri ? (
              <View style={styles.loaderContainer}> 
                <ActivityIndicator size="large" color={theme.colors.text.primary} />
              </View>
            ) : (
              <Image
                source={{ uri: currentImageUri }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}
          </View>
          <View style={styles.controlContainer}>
            <Pressable 
              style={styles.arrowButton} 
              onPress={onGoBack} 
              disabled={!canGoBack}
            >
              <Ionicons name="chevron-back-outline" size={iconSizes.xlarge} color={canGoBack ? theme.colors.text.primary : theme.colors.text.disabled} />
            </Pressable>

            <View style={styles.indexIndicator}>
              <Text style={styles.indexText}>
                {`${displayIndex} / ${displayTotal}`}
              </Text>
            </View>

            <Pressable 
              style={styles.arrowButton} 
              onPress={onGoForward} 
              disabled={!canGoForward}
            >
              <Ionicons name="chevron-forward-outline" size={iconSizes.xlarge} color={canGoForward ? theme.colors.text.primary : theme.colors.text.disabled} />
            </Pressable>
          </View>
        </View>
      </Pressable>
    </Modal>
  );
};

const getStyles = (theme: Theme) => StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  modalView: {
    width: screenWidth * 0.9,
    height: screenHeight * 0.9,
    backgroundColor: 'transparent',
    borderRadius: 10,
    paddingHorizontal: paddings.small,
    alignItems: 'center',
    position: 'relative',
  },
  closeButton: {
    position: 'absolute',
    top: paddings.medium,
    right: paddings.medium,
    zIndex: 1,
  },
  imageContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: paddings.medium,
  },
  loaderContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  modalImage: {
    width: '55%',
    aspectRatio: 1280 / 1100,
  },
  controlContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: paddings.medium,
    marginTop: paddings.small,
    height: 50,
  },
  arrowButton: {
    padding: paddings.small,
    opacity: 1,
    marginHorizontal: paddings.large,
  },
  indexIndicator: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: paddings.small,
    paddingVertical: 2,
    borderRadius: borderRadii.small,
    minWidth: 60,
    alignItems: 'center',
  },
  indexText: {
    color: '#fff',
    fontSize: 14,
  },
});

export default ScreenshotModal; 