import React from 'react';
import {
  FlatList,
  View,
  ActivityIndicator,
  StyleSheet,
  FlatListProps,
  RefreshControl,
  Platform,
} from 'react-native';
import { TextBody, TextSubtitle } from '@/features/shared/components/text';
import { paddings } from '@/features/shared/theme/spacing';
import { useTheme } from '@/features/shared/context/ThemeContext';
import { ApiError } from '@/api/types/api.types';

// Extend FlatListProps but omit props we handle internally or rename
interface BaseFlatListProps<T> extends Omit<FlatListProps<T>,
  'refreshControl' | 'ListFooterComponent' | 'ListEmptyComponent'
> {
  // State handling
  isLoading: boolean;
  isError: boolean;
  error?: ApiError | Error | null;
  isEmpty: boolean; // Derived from data length, but passed for explicit control if needed
  emptyStateMessage?: string;
  EmptyStateComponent?: React.ComponentType<any>;

  // Pagination
  isLoadingMore: boolean;
  // onEndReached, onEndReachedThreshold inherited

  // Refreshing
  isRefreshing?: boolean; // Optional, defaults based on isLoading if onRefresh provided
  onRefresh?: () => void;
}

const FlatListComponent = <T extends any>(
  props: BaseFlatListProps<T>,
  ref: React.Ref<FlatList<T>> // Define the ref type
) => {
  const {
    // State props
    isLoading,
    isError,
    error,
    isEmpty,
    emptyStateMessage = "No items found.",
    EmptyStateComponent,
    // Pagination props
    isLoadingMore,
    // Refresh props
    isRefreshing: isRefreshingProp,
    onRefresh,
    // Standard FlatList props
    data,
    inverted,
    ...rest
  } = props;

  const { theme } = useTheme();

  // Determine refresh state
  const isRefreshing = isRefreshingProp ?? (isLoading && !!onRefresh);

  // --- Render Loading State ---
  if (isLoading && (!data || data.length === 0)) { // Show only if no data is present yet
    return (
      <View style={styles.centeredContainer}>
        <ActivityIndicator size="large" color={theme.colors.text.primary} />
      </View>
    );
  }

  // --- Render Error State ---
  if (isError && (!data || data.length === 0)) { // Show only if no data is present yet
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return (
      <View style={styles.centeredContainer}>
        <TextSubtitle color={theme.colors.indicators.error}>Error loading data:</TextSubtitle>
        <TextBody color={theme.colors.indicators.error}>{errorMessage}</TextBody>
        {/* Optionally add a retry button here */}
      </View>
    );
  }

  // --- Render Empty State ---
  const renderEmptyComponent = () => {
    // Don't show empty state if initial loading is happening
    if (isLoading) return null;

    // Apply counter-transform for inverted web lists
    const emptyStyle = inverted && Platform.OS === 'web' ? styles.invertedContent : null;

    if (EmptyStateComponent) {
      return (
        <View style={emptyStyle}> 
          <EmptyStateComponent />
        </View>
      );
    }
    
    return (
      <View style={[styles.centeredContainer, emptyStyle]}>
        <TextSubtitle color={theme.colors.text.secondary}>{emptyStateMessage}</TextSubtitle>
      </View>
    );
  };

  // --- Render Footer (Pagination Loading Indicator) ---
  const renderFooter = () => {
    if (!isLoadingMore) return null;

    return (
      <View style={styles.loadingMoreContainer}>
        <ActivityIndicator size="small" color={theme.colors.text.secondary} />
      </View>
    );
  };

  // --- Render Refresh Control ---
  const refreshControl = onRefresh && Platform.OS !== 'web' ? (
    <RefreshControl
      refreshing={isRefreshing}
      onRefresh={onRefresh}
      tintColor={theme.colors.text.secondary}
    />
  ) : undefined;

  // --- Render Actual FlatList ---
  return (
    <FlatList
      ref={ref}
      data={data}
      ListEmptyComponent={renderEmptyComponent}
      ListFooterComponent={renderFooter}
      refreshControl={refreshControl}
      // Ensure keyExtractor is provided if not passed in rest
      keyExtractor={rest.keyExtractor ?? ((item: any, index: number) => item?._id ?? item?.id ?? String(index))}
      inverted={inverted}
      {...rest}
    />
  );
};

// Export the component with forwardRef applied
export const BaseFlatList = React.forwardRef(FlatListComponent) as <T>(props: BaseFlatListProps<T> & { ref?: React.Ref<FlatList<T>> }) => React.ReactElement;

const styles = StyleSheet.create({
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: paddings.large,
  },
  loadingMoreContainer: {
    paddingVertical: paddings.medium,
    alignItems: 'center',
  },
  invertedContent: {
    transform: [{ scaleY: -1 }],
  },
});