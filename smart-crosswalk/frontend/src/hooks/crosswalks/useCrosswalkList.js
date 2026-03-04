import { useState, useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { crosswalksApi } from "../../api";
import { queryKeys } from "../queryKeys";

const PAGE_SIZE = 10;

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
