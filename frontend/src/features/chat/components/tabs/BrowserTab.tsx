import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  Pressable,
  Image,
  View,
  ActivityIndicator,
  Text,
  ScrollView,
  Dimensions,
  Platform,
} from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming,
  useAnimatedGestureHandler,
  runOnJS
} from 'react-native-reanimated';
import { useTheme } from '@/features/shared/context/ThemeContext';
import { Theme } from '@/features/shared/context/ThemeContext';

import { ScreenshotData } from '@/api/types/chat.types';
import { ApiError } from '@/api/types/api.types';
import { paddings, borderRadii } from '@/features/shared/theme/spacing';
import { FgView } from '@/features/shared/components/layout';
import { TextBody, TextCaption } from '@/features/shared/components/text';

interface BrowserTabProps {
  screenshots: ScreenshotData[];
  screenshotsError: ApiError | null;
  loadingScreenshots: boolean;
  totalScreenshotsCount: number | null;
  currentScreenshotIndex: number;
  loadingMoreScreenshots: boolean;
  hasMoreScreenshots: boolean;
  fetchMoreScreenshots: () => void;
  openImageModal: (uri: string) => void;
  setCurrentScreenshotIndex: React.Dispatch<React.SetStateAction<number>>;
  justLoadedMoreRef: React.MutableRefObject<boolean>;
  isLiveMode: boolean;
  setIsLiveMode: React.Dispatch<React.SetStateAction<boolean>>;
}

export const BrowserTab: React.FC<BrowserTabProps> = ({
  screenshots,
  screenshotsError,
  loadingScreenshots,
  totalScreenshotsCount,
  currentScreenshotIndex,
  loadingMoreScreenshots,
  hasMoreScreenshots,
  fetchMoreScreenshots,
  openImageModal,
  setCurrentScreenshotIndex,
  justLoadedMoreRef,
  isLiveMode,
  setIsLiveMode,
}) => {
  const { theme } = useTheme();

  const [isDragging, setIsDragging] = useState(false);

  // Handle LIVE mode toggle - always go to latest screenshot when toggled
  const handleLiveModeToggle = () => {
    setIsLiveMode(!isLiveMode);
    // Always jump to latest screenshot when toggling LIVE mode
    setCurrentScreenshotIndex(0);
  };
  const progressTrackRef = useRef<View>(null);
  const lastFetchTimeRef = useRef<number>(0);
  const prefetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const styles = getStyles(theme, isDragging);
  
  // Dropdown animation

  
  // Progress bar animation
  const progressBarWidth = Dimensions.get('window').width * 0.25; // Approximate panel width
  const translateX = useSharedValue(0);
  
  // Use actual loaded screenshots length for bounds checking, not totalCount
  const availableCount = screenshots.length;
  // Use total count for progress calculation, not just loaded count
  const totalCount = totalScreenshotsCount || availableCount;
  // Reverse progress: index 0 (latest) = 100%, last index (oldest) = 0%
  const progress = totalCount > 1 ? (totalCount - 1 - currentScreenshotIndex) / (totalCount - 1) : 1;



  useEffect(() => {
    // Ensure currentScreenshotIndex is within bounds
    if (currentScreenshotIndex >= availableCount && availableCount > 0) {
      setCurrentScreenshotIndex(availableCount - 1);
      return;
    }
    // Thumb can now reach the full width (0 to progressBarWidth)
    translateX.value = withTiming(progress * progressBarWidth, { duration: 200 });
  }, [currentScreenshotIndex, availableCount, progressBarWidth]);



  const progressThumbStyle = useAnimatedStyle(() => {
    // Center the thumb: at 0% progress, thumb is at -10 (left edge), at 100% progress, thumb is at progressBarWidth - 10 (right edge)
    const thumbPosition = translateX.value - 10;
    return {
      transform: [{ translateX: thumbPosition }],
    };
  });

  const progressFillStyle = useAnimatedStyle(() => {
    return {
      width: translateX.value,
    };
  });

  // Prefetch the next 3 screenshots ahead of current position
  const prefetchScreenshots = useCallback((currentIndex: number) => {
    // Clear any existing prefetch timeout
    if (prefetchTimeoutRef.current) {
      clearTimeout(prefetchTimeoutRef.current);
    }

    // Delay prefetching to avoid interfering with immediate navigation
    prefetchTimeoutRef.current = setTimeout(() => {
      const prefetchAhead = 3;
      const maxIndexToPrefetch = Math.min(currentIndex + prefetchAhead, totalCount - 1);
      
      // Check if we need to prefetch (if any of the next 3 screenshots aren't loaded)
      const needsPrefetch = currentIndex + 1 < totalCount && 
                           maxIndexToPrefetch >= availableCount &&
                           hasMoreScreenshots && 
                           !loadingMoreScreenshots;

      if (needsPrefetch) {
        const now = Date.now();
        if (now - lastFetchTimeRef.current > 500) { // Shorter throttle for prefetch
          lastFetchTimeRef.current = now;
          justLoadedMoreRef.current = true;
          fetchMoreScreenshots();
        }
      }
    }, 200); // Small delay to not interfere with user navigation
  }, [totalCount, availableCount, hasMoreScreenshots, loadingMoreScreenshots, fetchMoreScreenshots]);

  const updateScreenshotIndex = (newIndex: number) => {
    // Allow navigation within total count, not just loaded screenshots
    if (newIndex >= 0 && newIndex < totalCount) {
      setCurrentScreenshotIndex(newIndex);
      
      // If user manually navigates away from latest screenshot (index 0) while LIVE mode is on, disable LIVE mode
      if (isLiveMode && newIndex !== 0) {
        setIsLiveMode(false);
      }
      
      // Only fetch more if:
      // 1. The requested index is beyond currently loaded screenshots
      // 2. There are more screenshots to load
      // 3. Not already loading more
      // 4. The requested screenshot doesn't exist yet
      // 5. Throttle requests (minimum 1 second between fetches)
      const now = Date.now();
      if (newIndex >= availableCount && 
          hasMoreScreenshots && 
          !loadingMoreScreenshots &&
          !screenshots[newIndex] &&
          now - lastFetchTimeRef.current > 1000) {
        lastFetchTimeRef.current = now;
        justLoadedMoreRef.current = true;
        fetchMoreScreenshots();
      }

      // Trigger prefetching after navigation
      prefetchScreenshots(newIndex);
    }
  };

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, context: any) => {
      context.startX = translateX.value;
    },
    onActive: (event, context: any) => {
      const newTranslateX = Math.max(0, Math.min(progressBarWidth, context.startX + event.translationX));
      translateX.value = newTranslateX;
      
      const newProgress = newTranslateX / progressBarWidth;
      // Reverse the index calculation: 100% progress = index 0, 0% progress = last index
      const newIndex = Math.round((1 - newProgress) * (totalCount - 1));
      runOnJS(updateScreenshotIndex)(newIndex);
    },
  });



  // Universal progress bar click handler
  const handleProgressClick = (event: any) => {
    if (!progressTrackRef.current) return;
    
    progressTrackRef.current.measure((x, y, width, height, pageX, pageY) => {
      let clickX;
      
      if (Platform.OS === 'web') {
        clickX = event.pageX - pageX;
      } else {
        // Mobile touch event
        clickX = event.nativeEvent.locationX;
      }
      
      const progress = Math.max(0, Math.min(1, clickX / width));
      // Reverse the index calculation: 100% progress = index 0, 0% progress = last index
      const newIndex = Math.round((1 - progress) * (totalCount - 1));
      updateScreenshotIndex(newIndex);
    });
  };

  // Web mouse event handlers
  const handleMouseDown = (event: any) => {
    if (Platform.OS !== 'web') return;
    setIsDragging(true);
    handleProgressClick(event);
  };

  const handleMouseMove = (event: any) => {
    if (Platform.OS !== 'web' || !isDragging) return;
    handleProgressClick(event);
  };

  const handleMouseUp = () => {
    if (Platform.OS !== 'web') return;
    setIsDragging(false);
  };

  // Mobile touch handlers
  const handleTouchStart = (event: any) => {
    if (Platform.OS === 'web') return;
    handleProgressClick(event);
  };

  // Add global mouse up listener for web
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    
    const handleGlobalMouseUp = () => setIsDragging(false);
    const handleGlobalMouseMove = (event: MouseEvent) => {
      if (isDragging) {
        handleProgressClick(event);
      }
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    document.addEventListener('mousemove', handleGlobalMouseMove);

    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [isDragging, availableCount, totalCount]);

  // Cleanup prefetch timeout on unmount
  useEffect(() => {
    return () => {
      if (prefetchTimeoutRef.current) {
        clearTimeout(prefetchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <ScrollView contentContainerStyle={styles.tabContentContainer}>
      {screenshotsError ? (
        <Text style={styles.errorText}>Error loading screenshots.</Text>
      ) : totalScreenshotsCount !== null && totalScreenshotsCount > 0 ? (
        <View style={styles.carouselContainer}>
          <Pressable
            style={styles.screenshotImageWrapper}
            onPress={() =>
              screenshots[currentScreenshotIndex]?.image_data &&
              openImageModal(screenshots[currentScreenshotIndex].image_data)
            }
            disabled={!screenshots[currentScreenshotIndex]?.image_data}
          >
            {loadingMoreScreenshots || !screenshots[currentScreenshotIndex] ? (
              <View style={styles.screenshotImage}>
                <ActivityIndicator color={theme.colors.text.primary} />
              </View>
            ) : (
              <Image
                source={{ uri: screenshots[currentScreenshotIndex].image_data }}
                style={styles.screenshotImage}
                resizeMode="contain"
              />
            )}
          </Pressable>
          
          {/* Progress Bar */}
          <View style={styles.progressBarContainer}>
            <Pressable
              ref={progressTrackRef}
              style={styles.progressBarTrack}
              onPress={handleProgressClick}
              {...(Platform.OS === 'web' && {
                onMouseDown: handleMouseDown,
                onMouseMove: handleMouseMove,
                onMouseUp: handleMouseUp,
              })}
              {...(Platform.OS !== 'web' && {
                onTouchStart: handleTouchStart,
              })}
                          >
                {/* Filled portion */}
                <Animated.View style={[styles.progressBarFill, progressFillStyle]} />
                
                {/* Thumb */}
                {Platform.OS === 'web' ? (
                  <Animated.View style={[styles.progressBarThumb, progressThumbStyle]} />
                ) : (
                  <PanGestureHandler onGestureEvent={gestureHandler}>
                    <Animated.View style={[styles.progressBarThumb, progressThumbStyle]} />
                  </PanGestureHandler>
                )}
              </Pressable>            
          </View>
          
          {/* Progress text and LIVE toggle in same row */}
          <View style={styles.progressInfoContainer}>
            <Text style={[styles.progressText, { color: theme.colors.text.secondary }]}>
              {(totalScreenshotsCount || availableCount) - currentScreenshotIndex} / {totalScreenshotsCount || availableCount}
            </Text>
            
            {/* LIVE Mode Toggle */}
            <Pressable 
              style={styles.liveToggleContainer}
              onPress={handleLiveModeToggle}
            >
              <View style={[
                styles.radioButton,
                { 
                  borderColor: isLiveMode ? theme.colors.brand.primary : theme.colors.text.secondary,
                  backgroundColor: isLiveMode ? theme.colors.brand.primary : 'transparent'
                }
              ]}>
                {/* No inner circle needed - fully filled when active */}
              </View>
              <TextBody style={[styles.liveToggleText, { color: theme.colors.text.secondary }]}>
                LIVE
              </TextBody>
            </Pressable>
          </View>
          
          {screenshots[currentScreenshotIndex] && 
            <View style={styles.contextContainer}>
              <View style={styles.contextHeader}>
                <TextBody style={styles.contextLabelText}>
                  Context
                </TextBody>
              </View>
              
              <View style={styles.contextContent}>
                <TextBody style={styles.contextText}>
                  {screenshots[currentScreenshotIndex]?.memory ?? 'No context available'}
                </TextBody>
              </View>
            </View>
          }
        </View>
      ) : loadingScreenshots ? (
        // Show loading indicator during initial load
        <ActivityIndicator color={theme.colors.text.primary} />
      ) : (
        // Show empty text only if not loading and count is 0 or null
        <Text style={styles.emptyText}>No agent screenshots available.</Text>
      )}
    </ScrollView>
  );
};

const getStyles = (theme: Theme, isDragging: boolean) =>
  StyleSheet.create({
    /* layout */
    tabContentContainer: {
      flex: 1,
      alignItems: 'center',
      paddingVertical: paddings.medium,
    },
    carouselContainer: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
    },

    /* progress bar */
    progressBarContainer: {
      width: '100%',
      paddingHorizontal: paddings.medium,
      paddingVertical: paddings.small,
      flexDirection: 'row',
      alignItems: 'center',
      gap: paddings.small,
    },
    progressBarTrack: {
      flex: 1,
      height: 6,
      backgroundColor: theme.colors.layout.border,
      borderRadius: 2,
      position: 'relative',
      marginVertical: 10, // Add space for thumb
      ...(Platform.OS === 'web' && {
        cursor: 'pointer',
      }),
    },
    progressBarFill: {
      height: '100%',
      backgroundColor: theme.colors.brand.primary,
      borderRadius: 2,
      position: 'absolute',
      left: 0,
      top: 0,
    },
    progressBarThumb: {
      width: 20,
      height: 20,
      backgroundColor: theme.colors.brand.primary,
      borderRadius: 10,
      position: 'absolute',
      top: -8,
      borderWidth: 2,
      borderColor: theme.colors.layout.background,
      zIndex: 10,
      elevation: 5,
      ...(Platform.OS === 'web' && {
        cursor: isDragging ? 'grabbing' : 'grab',
      } as any),
    },
    progressText: {
      fontSize: 11,
      fontWeight: '500',
      minWidth: 35,
      textAlign: 'left',
    },
    progressInfoContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      paddingHorizontal: paddings.medium,
    },

    /* screenshot */
    screenshotImageWrapper: {
      width: '100%',
      backgroundColor: theme.colors.layout.foreground,
      marginBottom: paddings.small,
      flex: 1,
    },
    screenshotImage: {
      width: '100%',
      aspectRatio: 1280 / 1100,
    },

    /* context container */
    contextContainer: {
      width: '100%',
      paddingHorizontal: paddings.medium,
    },
    contextHeader: {
      flexDirection: 'row',
      gap: paddings.small,
      alignItems: 'center',
    },
    contextContent: {
      paddingHorizontal: paddings.small,
      paddingVertical: paddings.small,
    },

    /* typography */
    contextLabelText: {
      fontWeight: '600',
      fontSize: 16,
      color: theme.colors.text.primary,
    },
    contextText: {
      fontSize: 14,
      lineHeight: 20,
      color: theme.colors.text.secondary,
    },

    /* LIVE toggle */
    liveToggleContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: paddings.xsmall,
    },
    radioButton: {
      width: 10,
      height: 10,
      borderRadius: 8,
      borderWidth: 2,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radioButtonInner: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    liveToggleText: {
      fontSize: 12,
      fontWeight: '600',
      letterSpacing: 1,
    },

    /* misc */
    errorText: {
      color: theme.colors.indicators.error,
      textAlign: 'center',
    },
    emptyText: {
      color: theme.colors.text.secondary,
      textAlign: 'center',
    },
  });