import { useState, useCallback, useRef } from 'react'
import { useApi } from '@/api/useApi'
import { ApiResponse, ApiError } from '@/api/types/api.types'
import { PaginatedResponseData, PaginationParams } from '@/api/types/chat.types' // Assuming chat.types has the generic structure


interface UseApiPaginatedOptions<T> {
  pageSize?: number
  onSuccess?: (data: T[]) => void
  onError?: (error: ApiError | null) => void
  initialParams?: Record<string, any>
}

export function useApiPaginated<T, ExtraArgs extends any[] = []>(
  apiFunction: (...args: [...ExtraArgs, PaginationParams]) => Promise<ApiResponse<PaginatedResponseData<T>>>,
  options: UseApiPaginatedOptions<T> = {}
) {
  const [allData, setAllData] = useState<T[]>([])
  const [hasMore, setHasMore] = useState(true)
  const [nextCursorTimestamp, setNextCursorTimestamp] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false)
  const [totalItems, setTotalItems] = useState<number | null>(null);
  const [currentParams, setCurrentParams] = useState<Record<string, any>>(options.initialParams || {})
  const currentExtraArgsRef = useRef<ExtraArgs>([] as unknown as ExtraArgs);
  const requestIdRef = useRef(0)
  const pageSize = options.pageSize || 20

  const api = useApi<PaginatedResponseData<T>, [...ExtraArgs, PaginationParams]>(apiFunction as any, {
    onError: options.onError,
  })

  const fetch = useCallback(
    async (extraArgs: ExtraArgs = [] as unknown as ExtraArgs, params: Record<string, any> = {}, isRefresh = false) => {
      if (!isRefresh) {
        setAllData([]);
        setHasMore(true);
        setNextCursorTimestamp(null);
      }
      setCurrentParams(params);
      currentExtraArgsRef.current = extraArgs;
      
      const requestId = ++requestIdRef.current;
      
      const fullResponse = await api.execute(
        ...extraArgs,
        {
          ...params,
          limit: pageSize,
        }
      );
      
      if (fullResponse && requestId === requestIdRef.current) {
        const responseData = fullResponse.data;
        setAllData(responseData.items);
        setHasMore(responseData.has_more);
        setNextCursorTimestamp(responseData.next_cursor_timestamp);
        if (responseData.total_items !== undefined) {
            setTotalItems(responseData.total_items);
        }
        options.onSuccess?.(responseData.items);
        return fullResponse;
      }
      
      return null;
    },
    [api.execute, pageSize, options.onSuccess]
  );

  const fetchMore = useCallback(async () => {
    const extraArgs = currentExtraArgsRef.current;
    if (api.loading || loadingMore || !hasMore || !nextCursorTimestamp) {
      return null;
    }

    setLoadingMore(true);
    const requestId = ++requestIdRef.current;

    try {
      const fullResponse = await api.execute(
        ...extraArgs,
        {
          ...currentParams,
          limit: pageSize,
          before_timestamp: nextCursorTimestamp,
        }
      );

      if (fullResponse && requestId === requestIdRef.current) {
        const responseData = fullResponse.data;
        setAllData((prev) => [...prev, ...responseData.items]);
        setHasMore(responseData.has_more);
        setNextCursorTimestamp(responseData.next_cursor_timestamp);
        if (responseData.total_items !== undefined) {
            setTotalItems(responseData.total_items);
        }
        options.onSuccess?.(responseData.items);
        return fullResponse;
      }
      return null;
    } catch (error) {
      console.error('Error loading more:', error);
      return null;
    } finally {
      if (requestId === requestIdRef.current) {
        setLoadingMore(false);
      }
    }
  }, [api.execute, loadingMore, hasMore, nextCursorTimestamp, pageSize, currentParams, options.onSuccess]);

  const reset = useCallback(() => {
    setAllData([])
    setHasMore(true)
    setNextCursorTimestamp(null)
    setLoadingMore(false)
    setTotalItems(null);
    setCurrentParams(options.initialParams || {})
    currentExtraArgsRef.current = [] as unknown as ExtraArgs;
    api.reset()
  }, [api, options.initialParams])

  return {
    data: allData,
    setData: setAllData,
    error: api.error,
    loading: api.loading,
    loadingMore,
    hasMore,
    fetch,
    fetchMore,
    reset,
    totalItems,
    setTotalItems,
    nextCursorTimestamp,
  }
}