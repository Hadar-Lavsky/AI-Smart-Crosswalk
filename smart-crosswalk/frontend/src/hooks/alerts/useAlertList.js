import { useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { alertsApi } from "../../api";
import { queryKeys } from "../queryKeys";

const PAGE_SIZE = 10;

/**
 * useAlertList — fetches alerts with "Load More" pagination.
 *
 * Loads PAGE_SIZE alerts at a time. Each call to `loadMore()` fetches the
 * next page and appends results to the accumulated list.
 *
 * @param {object} [options]
 * @param {boolean} [options.autoRefresh=true]  - Poll the server automatically (page 1 only).
 * @param {number}  [options.refreshInterval=5000] - Polling interval in ms.
 * @returns {{ alerts: Array, loading: boolean, loadingMore: boolean, hasMore: boolean, loadMore: Function, refetch: Function }}
 */
export function useAlertList({ autoRefresh = true, refreshInterval = 5000 } = {}) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [accumulated, setAccumulated] = useState([]);

  const {
    data,
    isLoading: loading,
    isFetching,
    error,
  } = useQuery({
    queryKey: queryKeys.alerts.list(page),
    queryFn: async () => {
      const response = await alertsApi.getAll({ page, limit: PAGE_SIZE });
      return response;
    },
    refetchInterval: page === 1 && autoRefresh ? refreshInterval : false,
  });

  // Accumulate results when data changes
  useEffect(() => {
    if (!data?.data) return;

    if (page === 1) {
      setAccumulated(data.data);
    } else {
      setAccumulated((prev) => {
        const existingIds = new Set(prev.map((a) => a._id));
        const newItems = data.data.filter((a) => !existingIds.has(a._id));
        return [...prev, ...newItems];
      });
    }
  }, [data, page]);

  const hasMore = data?.pagination?.hasMore ?? false;
  const loadingMore = page > 1 && isFetching;

  const loadMore = useCallback(() => {
    if (hasMore && !isFetching) {
      setPage((p) => p + 1);
    }
  }, [hasMore, isFetching]);

  const refetch = useCallback(() => {
    setAccumulated([]);
    setPage(1);
    queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
  }, [queryClient]);

  return {
    alerts: accumulated,
    loading: loading && page === 1,
    loadingMore,
    hasMore,
    loadMore,
    error: error?.message || null,
    refetch,
  };
}
