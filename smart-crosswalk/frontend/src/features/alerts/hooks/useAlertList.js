import { useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { alertsApi } from "../api/alertsApi";
import { queryKeys } from "../../../hooks/queryKeys";

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

  // Always start this screen from a clean page-1 list.
  useEffect(() => {
    setAccumulated([]);
    setPage(1);
  }, []);

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
    refetchOnMount: "always",
    refetchOnReconnect: true,
  });

  // Accumulate results when data changes
  useEffect(() => {
    if (!data?.data) return;

    const serverTotal = data?.data?.pagination?.total;

    // If backend data shrank (e.g. alerts were deleted), restart from page 1
    // so stale accumulated rows are dropped.
    if (page > 1 && typeof serverTotal === "number" && accumulated.length > serverTotal) {
      setAccumulated([]);
      setPage(1);
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.list(1) });
      return;
    }

    if (page === 1) {
      setAccumulated(data.data);
    } else {
      setAccumulated((prev) => {
        // Replace the current page window and trim to backend total.
        const start = (page - 1) * PAGE_SIZE;
        const next = [...prev];
        next.splice(start, PAGE_SIZE, ...data.data);

        if (typeof serverTotal === "number") {
          return next.slice(0, serverTotal);
        }

        return next;
      });
    }
  }, [accumulated.length, data, page, queryClient]);

  const hasMore = data?.data?.pagination?.hasMore ?? false;
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
    refetch,
  };
}
