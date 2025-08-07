import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { 
  Pressable, 
  StyleSheet, 
  View, 
  Image, 
  ActivityIndicator, 
  Text,
  FlatList,
  ViewToken,
  Dimensions
} from 'react-native';
import { Stack, useLocalSearchParams, useNavigation } from 'expo-router';
import { BgView } from '@/features/shared/components/layout';
import { TextBody } from '@/features/shared/components/text';
import { paddings, borderRadii } from '@/features/shared/theme/spacing';
import { iconSizes } from '@/features/shared/theme/sizes';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/features/shared/context/ThemeContext';
import { Theme } from '@/features/shared/context/ThemeContext';
import { useChat } from '@/features/chat/context';
import { ScreenshotControls } from '@/features/chat/components/common/ScreenshotControls';

type Tab = 'browser' | 'context';

export default function NativeAgentDetailScreen() {
  const { chatId } = useLocalSearchParams<{ chatId: string }>();
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { 
    screenshots, 
    loadingScreenshots, 
    screenshotsError, 
    fetchScreenshots,
    totalScreenshotsCount,
    fetchMoreScreenshots,
    hasMoreScreenshots,
    loadingMoreScreenshots,
  } = useChat();
  const [activeTab, setActiveTab] = useState<Tab>('browser');
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  
  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      const firstVisible = viewableItems[0];
      if (firstVisible.index !== null && firstVisible.isViewable) {
        setCurrentIndex(firstVisible.index);
      }
    }
  }, []);

  useEffect(() => {
    if (chatId) {
      fetchScreenshots(chatId);
      setCurrentIndex(0);
    }
  }, [chatId, fetchScreenshots]);

  const styles = getStyles(theme);

  if (!chatId) {
    return <BgView style={styles.container}><TextBody>Error: Chat ID missing.</TextBody></BgView>;
  }

  return (
    <BgView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Agent Task',
          headerLeft: () => (
            <Pressable 
              onPress={() => navigation.goBack()}
            >
              <Ionicons 
                name="chevron-back-outline"
                size={iconSizes.medium}
                color={theme.colors.text.primary}
              />
            </Pressable>
          ),
        }}
      />

      <View style={styles.tabContainer}>
        <Pressable 
          style={[styles.tabButton, activeTab === 'browser' && styles.activeTabButton]}
          onPress={() => setActiveTab('browser')}
        >
          <Text style={[styles.tabText, activeTab === 'browser' && styles.activeTabText]}>Browser</Text>
        </Pressable>
        <Pressable 
          style={[styles.tabButton, activeTab === 'context' && styles.activeTabButton]}
          onPress={() => setActiveTab('context')}
        >
          <Text style={[styles.tabText, activeTab === 'context' && styles.activeTabText]}>Context</Text>
        </Pressable>
      </View>

      {/* --- Tab Content --- */}
      {activeTab === 'browser' ? (
        <View style={styles.tabContentContainer}>
          {loadingScreenshots && !loadingMoreScreenshots ? <ActivityIndicator color={theme.colors.text.primary} style={styles.centered} /> : null}
          {screenshotsError ? <Text style={styles.errorText}>Error loading agent activity.</Text> : null}
          {!screenshotsError ? (
            totalScreenshotsCount !== null && totalScreenshotsCount > 0 ? (
              <View style={styles.carouselContainer}>
                <FlatList
                  ref={flatListRef}
                  data={screenshots}
                  renderItem={({ item }) => (
                    <View style={styles.screenshotItemContainer}>
                      <Image 
                        source={{ uri: item.image_data }}
                        style={styles.screenshotImage}
                        resizeMode="contain"
                      />
                    </View>
                  )}
                  keyExtractor={(item) => item._id}
                  horizontal
                  pagingEnabled
                  inverted
                  showsHorizontalScrollIndicator={false}
                  onViewableItemsChanged={onViewableItemsChanged}
                  viewabilityConfig={viewabilityConfig}
                  onEndReached={() => {
                    if (hasMoreScreenshots && !loadingMoreScreenshots) {
                      fetchMoreScreenshots();
                    }
                  }}
                  onEndReachedThreshold={0.5}
                  getItemLayout={(_, index) => ({
                    length: styles.screenshotItemContainer.width,
                    offset: styles.screenshotItemContainer.width * index,
                    index,
                  })}
                />
                {loadingMoreScreenshots && (
                  <View style={styles.loaderOverlay}>
                    <ActivityIndicator size="large" color={theme.colors.text.primary} />
                  </View>
                )}
                <ScreenshotControls
                  currentIndex={currentIndex} 
                  totalLoaded={screenshots.length}
                  totalCount={totalScreenshotsCount}
                  isLoadingMore={loadingMoreScreenshots}
                  onGoBack={() => {
                    if (flatListRef.current && currentIndex < screenshots.length - 1) {
                      flatListRef.current.scrollToIndex({ animated: true, index: currentIndex + 1 });
                    }
                  }}
                  onGoForward={() => {
                    if (flatListRef.current && currentIndex > 0) {
                      flatListRef.current.scrollToIndex({ animated: true, index: currentIndex - 1 });
                    }
                  }}
                />
              </View>
            ) : (
              <Text style={styles.emptyText}>No agent activity recorded yet.</Text>
            )
          ) : null}
        </View>
      ) : null}

      {activeTab === 'context' ? (
        <View style={styles.tabContentContainer}>
          <Text style={styles.contextPlaceholder}>Context View Placeholder</Text>
        </View>
      ) : null}
    </BgView>
  );
}

const getStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  tabContainer: {
    flexDirection: 'row',
    padding: paddings.medium, 
  },
  tabButton: {
    paddingVertical: paddings.small + 2,
    paddingHorizontal: paddings.large,
    marginRight: paddings.small,
    borderRadius: borderRadii.medium,
    borderWidth: 1,
    borderColor: theme.colors.layout.border,
    backgroundColor: 'transparent',
  },
  activeTabButton: {
    backgroundColor: theme.colors.layout.foreground,
    borderColor: theme.colors.layout.border,
  },
  tabText: {
    color: theme.colors.text.secondary,
    fontWeight: '500',
  },
  activeTabText: {
    color: theme.colors.text.primary,
    fontWeight: '600',
  },
  tabContentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: paddings.medium,
    paddingHorizontal: paddings.small,
  },
  carouselContainer: {
    width: '100%',
    height: 500,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  screenshotItemContainer: {
    width: Dimensions.get('window').width - (paddings.small * 2), 
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  screenshotImage: {
    width: '100%',
    height: '100%',
    borderRadius: borderRadii.medium,
  },
  loaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  contextPlaceholder: {
    color: theme.colors.text.secondary,
    fontSize: 16,
  },
  errorText: {
    color: theme.colors.indicators.error,
    marginTop: paddings.large,
  },
  emptyText: {
    color: theme.colors.text.secondary,
    marginTop: paddings.large,
  },
  centered: {
    marginTop: paddings.large,
    alignSelf: 'center',
  },
  listFooterLoader: {
    marginHorizontal: paddings.large,
  }
}); 