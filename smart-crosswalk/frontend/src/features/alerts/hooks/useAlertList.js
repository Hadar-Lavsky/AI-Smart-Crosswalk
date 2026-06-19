import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { alertsApi } from "../api/alertsApi";
import { queryKeys } from "../../../hooks/queryKeys";

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 300;

/**
 * useAlertList — fetches alerts with "Load More" pagination and server-side
 * filtering.
 *
 * Filters (danger level, crosswalk text search, date range) are sent to the
 * API, so filtering and paging stay consistent across the entire dataset
 * instead of only the rows currently loaded in the browser. The free-text
 * search is debounced so typing doesn't fire a request per keystroke.
 *
 * @param {object} [options]
 * @param {boolean} [options.autoRefresh=true]  - Poll the server automatically (page 1 only).
 * @param {number}  [options.refreshInterval=5000] - Polling interval in ms.
 * @param {object}  [options.filters] - { dangerLevel, crosswalkSearch, dateRange:{ startDate, endDate } }
 * @returns {{ alerts: Array, loading: boolean, loadingMore: boolean, hasMore: boolean, loadMore: Function, refetch: Function, error: unknown }}
 */
export function useAlertList({
  autoRefresh = true,
  refreshInterval = 5000,
  filters = {},
} = {}) {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [accumulated, setAccumulated] = useState([]);

  // Normalize incoming filters into flat values.
  const dangerLevel = filters.dangerLevel ?? "all";
  const rawSearch = filters.crosswalkSearch ?? "";
  const startDate = filters.dateRange?.startDate ?? null;
  const endDate = filters.dateRange?.endDate ?? null;

  // Debounce only the free-text search; selects / date presets apply at once.
  const [debouncedSearch, setDebouncedSearch] = useState(rawSearch);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(rawSearch), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [rawSearch]);

  // Server-ready, stable set of the *applied* filters. Drives both the query
  // cache key and the "reset to page 1" effect below. Undefined keys are
  // dropped by axios, so they simply aren't sent.
  const appliedFilters = useMemo(
    () => ({
      dangerLevel: dangerLevel !== "all" ? dangerLevel : undefined,
      crosswalkSearch: debouncedSearch.trim() || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    [dangerLevel, debouncedSearch, startDate, endDate]
  );
  const filtersSig = JSON.stringify(appliedFilters);

  // Whenever the applied filters change, restart from a clean page-1 list.
  useEffect(() => {
    setAccumulated([]);
    setPage(1);
  }, [filtersSig]);

  const {
    data,
    isLoading: loading,
    isFetching,
    error,
  } = useQuery({
    queryKey: queryKeys.alerts.list(page, appliedFilters),
    queryFn: async () => {
      const response = await alertsApi.getAll({
        page,
        limit: PAGE_SIZE,
        ...appliedFilters,
      });
      return response;
    },
    refetchInterval: page === 1 && autoRefresh ? refreshInterval : false,
    refetchOnMount: "always",
    refetchOnReconnect: true,
  });

  // Accumulate results when data changes
  useEffect(() => {
    if (!data?.data) return;

    const serverTotal = data?.pagination?.total;

    // If backend data shrank (e.g. alerts were deleted), restart from page 1
    // so stale accumulated rows are dropped.
    if (page > 1 && typeof serverTotal === "number" && accumulated.length > serverTotal) {
      setAccumulated([]);
      setPage(1);
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
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
    refetch,
    error,
  };
}
