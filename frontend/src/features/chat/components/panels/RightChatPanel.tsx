import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Pressable, ScrollView, Image, View, Dimensions, ActivityIndicator, Text, Platform, FlatList } from 'react-native';
import { BgView, BaseColumn } from '@/features/shared/components/layout';
import { paddings, borderRadii } from '@/features/shared/theme/spacing';
import { useTheme } from '@/features/shared/context/ThemeContext';
import { useResponsiveLayout } from '@/features/shared/hooks';
import { useChat } from '../../context';
import { Ionicons } from '@expo/vector-icons';
import { iconSizes } from '@/features/shared/theme/sizes';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withTiming, 
  Easing 
} from 'react-native-reanimated';
import { Theme } from '@/features/shared/context/ThemeContext';
import ScreenshotModal from '../modals/ScreenshotModal';
import { ToolCallsTab } from '../tabs/ToolCallsTab';
import { BrowserTab } from '../tabs/BrowserTab';

interface RightChatPanelProps {
  isVisible: boolean;
  onClose: () => void;
  selectedInvocationId?: string | null;
}

const PANEL_WIDTH_PERCENT = 30;
const MOBILE_WIDTH_PERCENT = 100;
const ANIMATION_DURATION = 250;

export const RightChatPanel: React.FC<RightChatPanelProps> = ({
  isVisible,
  onClose,
  selectedInvocationId,
}) => {
  const { theme } = useTheme();
  const { isMobile } = useResponsiveLayout();
  const { 
    screenshots, 
    loadingScreenshots, 
    screenshotsError, 
    fetchScreenshots, 
    selectedChatId,
    fetchMoreScreenshots,
    hasMoreScreenshots,
    loadingMoreScreenshots,
    totalScreenshotsCount,
    activeTab,
    setActiveTab,
    currentScreenshotIndex,
    setCurrentScreenshotIndex,
    isLiveMode,
    setIsLiveMode,
    isImageModalOpen,
    setIsImageModalOpen,
  } = useChat();
  const targetWidth = isMobile ? MOBILE_WIDTH_PERCENT : PANEL_WIDTH_PERCENT;
  const animatedWidth = useSharedValue(isVisible ? targetWidth : 0);
  const justLoadedMoreRef = useRef(false);
  const fetchScreenshotsRef = useRef(fetchScreenshots);

  // Update ref when fetchScreenshots changes
  useEffect(() => {
    fetchScreenshotsRef.current = fetchScreenshots;
  }, [fetchScreenshots]);

  const openImageModal = (uri: string) => {
    setIsImageModalOpen(true);
  };

  const closeImageModal = () => {
    setIsImageModalOpen(false);
  };

  useEffect(() => {
    animatedWidth.value = withTiming(
      isVisible ? targetWidth : 0,
      { duration: ANIMATION_DURATION, easing: Easing.inOut(Easing.ease) }
    );
  }, [isVisible, animatedWidth, targetWidth]);

  // Separate effect for fetching screenshots to avoid WebSocket disconnection
  // Use ref to avoid dependency on fetchScreenshots function
  useEffect(() => {
    if (isVisible && selectedChatId) {
      fetchScreenshotsRef.current(selectedChatId);
    }
  }, [isVisible, selectedChatId]);

  useEffect(() => {
    if (justLoadedMoreRef.current) {
      setCurrentScreenshotIndex(prev => Math.min(prev + 1, screenshots.length - 1));
      justLoadedMoreRef.current = false;
    }
  }, [screenshots]);

  useEffect(() => {
    if (selectedInvocationId && isVisible) {
      setActiveTab('tool_calls');
    }
  }, [selectedInvocationId, isVisible]);

  const animatedStyle = useAnimatedStyle(() => {
    const marginRightValue = isVisible && !isMobile ? paddings.medium : 0;
    return {
      width: `${animatedWidth.value}%`,
      marginRight: withTiming(marginRightValue, { duration: ANIMATION_DURATION, easing: Easing.inOut(Easing.ease) }),
      overflow: 'hidden',
    };
  });

  const styles = getStyles(theme, isMobile);

  if (!isVisible) {
    return null;
  }

  return (
    <>
      {isMobile && isVisible && (
        <Pressable style={styles.mobileBackdrop} onPress={onClose} />
      )}
      <Animated.View style={[
        styles.animatedContainer, 
        animatedStyle,
        isMobile && styles.mobileContainer
      ]}>
        <BgView style={styles.rightPanelContent}>
        <Pressable style={styles.closeRightPanelButton} onPress={onClose}>
          <Ionicons name="close-outline" size={iconSizes.medium} color={theme.colors.text.secondary} />
        </Pressable>

        <View style={styles.tabContainer}>
          <Pressable 
            style={[styles.tabButton, activeTab === 'browser' && styles.activeTabButton]}
            onPress={() => setActiveTab('browser')}
          >
            <Text style={[styles.tabText, activeTab === 'browser' && styles.activeTabText]}>Browser</Text>
          </Pressable>
          <Pressable 
            style={[styles.tabButton, activeTab === 'tool_calls' && styles.activeTabButton]}
            onPress={() => setActiveTab('tool_calls')}
          >
            <Text style={[styles.tabText, activeTab === 'tool_calls' && styles.activeTabText]}>Tool Calls</Text>
          </Pressable>
        </View>

        <BaseColumn style={styles.panelColumn}>
          <View style={[styles.tabContent, { display: activeTab === 'browser' ? 'flex' : 'none' }]}>
            <BrowserTab 
              screenshots={screenshots}
              screenshotsError={screenshotsError}
              loadingScreenshots={loadingScreenshots}
              totalScreenshotsCount={totalScreenshotsCount}
              currentScreenshotIndex={currentScreenshotIndex}
              loadingMoreScreenshots={loadingMoreScreenshots}
              hasMoreScreenshots={hasMoreScreenshots}
              fetchMoreScreenshots={fetchMoreScreenshots}
              openImageModal={openImageModal}
              setCurrentScreenshotIndex={setCurrentScreenshotIndex}
              justLoadedMoreRef={justLoadedMoreRef}
              isLiveMode={isLiveMode}
              setIsLiveMode={setIsLiveMode}
            />
          </View>

          <View style={[styles.tabContent, { display: activeTab === 'tool_calls' ? 'flex' : 'none' }]}>
            <ToolCallsTab
              scrollToInvocationId={selectedInvocationId}
              highlightInvocationId={selectedInvocationId}
            />
          </View>
        </BaseColumn>
        
        <ScreenshotModal 
          isVisible={isImageModalOpen} 
          screenshots={screenshots} 
          onClose={closeImageModal} 
          currentIndex={currentScreenshotIndex}
          totalLoaded={screenshots.length}
          totalCount={totalScreenshotsCount}
          onGoBack={() => {
            if (currentScreenshotIndex === screenshots.length - 1 && hasMoreScreenshots) {
              justLoadedMoreRef.current = true; 
              fetchMoreScreenshots();
            } else if (currentScreenshotIndex < screenshots.length - 1) {
               const newIndex = currentScreenshotIndex + 1;
               setCurrentScreenshotIndex(newIndex);
               // If navigating away from latest screenshot (index 0) while LIVE mode is on, disable LIVE mode
               if (isLiveMode && newIndex !== 0) {
                 setIsLiveMode(false);
               }
            }
          }}
          onGoForward={() => {
            const newIndex = Math.max(0, currentScreenshotIndex - 1);
            setCurrentScreenshotIndex(newIndex);
            // If navigating away from latest screenshot (index 0) while LIVE mode is on, disable LIVE mode
            if (isLiveMode && newIndex !== 0) {
              setIsLiveMode(false);
            }
          }}
          loadingMoreScreenshots={loadingMoreScreenshots}
        />
      </BgView>
      </Animated.View>
    </>
  );
};

const getStyles = (theme: Theme, isMobile: boolean = false) => StyleSheet.create({
  animatedContainer: {
    height: isMobile ? '100%' : '97.5%',
    borderRadius: isMobile ? 0 : borderRadii.large,
    overflow: 'hidden',
  },
  mobileContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  mobileBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  rightPanelContent: {
    height: '100%',
    position: 'relative',
    flexDirection: 'column',
  },
  closeRightPanelButton: {
    position: 'absolute',
    top: paddings.medium, 
    right: paddings.medium, 
    zIndex: 1,
  },
  panelColumn: {
    flex: 1,
    paddingTop: paddings.medium,
    paddingHorizontal: paddings.medium,
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.layout.border,
    paddingHorizontal: paddings.medium, 
    paddingTop: paddings.xlarge,
    alignItems: 'center',
  },
  tabButton: {
    paddingVertical: paddings.small,
    paddingHorizontal: paddings.medium,
    marginRight: paddings.small,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: theme.colors.text.primary,
  },
  tabText: {
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  errorText: {
    color: theme.colors.indicators.error,
    marginTop: paddings.medium,
    textAlign: 'center',
  },
  emptyText: {
    color: theme.colors.text.secondary,
    marginTop: paddings.medium,
    textAlign: 'center',
  },
  loadMoreButton: {
    paddingVertical: paddings.medium, 
    alignItems: 'center',
  },
  loadMoreText: {
    color: theme.colors.text.primary,
    fontWeight: '500',
  },
}); 