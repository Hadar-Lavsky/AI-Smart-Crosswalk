import { useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { crosswalksApi } from "../api/crosswalksApi";
import { queryKeys } from "../../../hooks/queryKeys";

const PAGE_SIZE = 10;

const DEFAULT_FILTERS = {
  dateRange: { startDate: null, endDate: null },
  dangerLevel: "all",
  sortBy: "newest",
};

/**
 * useCrosswalkList — fetches crosswalks with "Load More" pagination.
 *
 * Loads PAGE_SIZE crosswalks at a time. Each call to `loadMore()` fetches
 * the next page and appends results to the accumulated list.
 *
 * @returns {{ crosswalks: Array, loading: boolean, loadingMore: boolean, hasMore: boolean, loadMore: Function, refetch: Function }}
 */
export function useCrosswalkList() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [accumulated, setAccumulated] = useState([]);

  const {
    data,
    isLoading: loading,
    isFetching,
    error,
  } = useQuery({
    queryKey: queryKeys.crosswalks.list(page),
    queryFn: async () => {
      const response = await crosswalksApi.getAll({ page, limit: PAGE_SIZE });
      return response;
    },
  });

  // Accumulate results when data changes
  useEffect(() => {
    if (!data?.data) return;

    if (page === 1) {
      setAccumulated(data.data);
    } else {
      setAccumulated((prev) => {
        const existingIds = new Set(prev.map((c) => c._id));
        const newItems = data.data.filter((c) => !existingIds.has(c._id));
        return [...prev, ...newItems];
      });
    }
  }, [data, page]);

  // Prefetch alerts and stats for crosswalks loaded via "Load More" (page > 1).
  // Page 1 is already prefetched in main.jsx before React renders.
  useEffect(() => {
    if (!data?.data?.length || page === 1) return;

    data.data.forEach((crosswalk) => {
      const id = crosswalk._id;

      queryClient.setQueryData(queryKeys.crosswalks.detail(id), crosswalk);

      queryClient.prefetchQuery({
        queryKey: queryKeys.crosswalks.alerts(id, DEFAULT_FILTERS, 1),
        queryFn: async () => {
          const response = await crosswalksApi.getAlerts(id, {
            startDate: null,
            endDate: null,
            dangerLevel: "all",
            sortBy: "newest",
            page: 1,
            limit: PAGE_SIZE,
          });
          return {
            alerts: response.alerts || [],
            pagination: response.pagination || {
              totalPages: 1,
              totalAlerts: 0,
              hasMore: false,
            },
          };
        },
        staleTime: 5 * 60 * 1000,
      });

      queryClient.prefetchQuery({
        queryKey: queryKeys.crosswalks.detailStats(id),
        queryFn: async () => {
          const response = await crosswalksApi.getCrosswalkStats(id);
          return response.data;
        },
        staleTime: 5 * 60 * 1000,
      });
    });
  }, [data, page, queryClient]);

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
    queryClient.invalidateQueries({ queryKey: queryKeys.crosswalks.all });
  }, [queryClient]);

  return {
    crosswalks: accumulated,
    loading: loading && page === 1,
    loadingMore,
    hasMore,
    loadMore,
    error: error?.message || null,
    refetch,
  };
}
