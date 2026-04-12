import { queryKeys } from './hooks/queryKeys';
import { crosswalksApi } from './features/crosswalks/api/crosswalksApi';

const PAGE_SIZE = 10;

const DEFAULT_ALERT_FILTERS = {
  dateRange: { startDate: null, endDate: null },
  dangerLevel: 'all',
  sortBy: 'newest',
};

/**
 * prefetchAppData — fires immediately when the app boots (before React renders).
 * Fetches the first page of crosswalks, then fans out to prefetch alerts and
 * stats for every crosswalk in parallel. By the time the user can click anything
 * the data is already in the React Query cache — zero loading indicators.
 */
export async function prefetchAppData(queryClient) {
  try {
    const response = await queryClient.fetchQuery({
      queryKey: queryKeys.crosswalks.list(1),
      queryFn: () => crosswalksApi.getAll({ page: 1, limit: PAGE_SIZE }),
      staleTime: 5 * 60 * 1000,
    });

    if (!response?.data?.length) return;

    // Seed each crosswalk's detail cache from list data (no extra API round-trips)
    response.data.forEach((crosswalk) => {
      queryClient.setQueryData(queryKeys.crosswalks.detail(crosswalk._id), crosswalk);
    });

    // Fan out: prefetch alerts + stats for every crosswalk concurrently
    response.data.forEach((crosswalk) => {
      const id = crosswalk._id;

      queryClient.prefetchQuery({
        queryKey: queryKeys.crosswalks.alerts(id, DEFAULT_ALERT_FILTERS, 1),
        queryFn: async () => {
          const res = await crosswalksApi.getAlerts(id, {
            startDate: null,
            endDate: null,
            dangerLevel: 'all',
            sortBy: 'newest',
            page: 1,
            limit: PAGE_SIZE,
          });
          return {
            alerts: res.alerts || [],
            pagination: res.pagination || { totalPages: 1, totalAlerts: 0, hasMore: false },
          };
        },
        staleTime: 5 * 60 * 1000,
      });

      queryClient.prefetchQuery({
        queryKey: queryKeys.crosswalks.detailStats(id),
        queryFn: async () => {
          const res = await crosswalksApi.getCrosswalkStats(id);
          return res.data;
        },
        staleTime: 5 * 60 * 1000,
      });
    });
  } catch {
    // Prefetch failures are silent — the app fetches on demand as fallback
  }
}
