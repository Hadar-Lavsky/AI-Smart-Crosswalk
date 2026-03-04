import { useState, useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { crosswalksApi } from '../api';
import { queryKeys } from './queryKeys';

const PAGE_SIZE = 10;

// Hook for the crosswalk detail page. Loads a single crosswalk, its alerts and its statistics.
export function useCrosswalkDetails(crosswalkId) {
  const queryClient = useQueryClient();

  // Local state for the alert filters (date range, danger level, sort order) and current page.
  const [filters, setFilters] = useState({
    dateRange: { startDate: null, endDate: null },
    dangerLevel: 'all',
    sortBy: 'newest'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [accumulated, setAccumulated] = useState([]);

  // Fetch a single crosswalk by its ID.
  // If the crosswalks list was already loaded, the data is taken from cache instantly
  // without making a new server request.
  const {
    data: crosswalk = null,
    isLoading: crosswalkLoading,
    error: crosswalkError
  } = useQuery({
    queryKey: queryKeys.crosswalks.detail(crosswalkId),
    queryFn: async () => {
      const response = await crosswalksApi.getById(crosswalkId);
      return response.data;
    },
    enabled: !!crosswalkId,
    // Use data from crosswalks cache if available (instant display)
    initialData: () => {
      const crosswalks = queryClient.getQueryData(queryKeys.crosswalks.all);
      return crosswalks?.find(c => c._id === crosswalkId);
    },
    // Keep the cached data for 1 minute before refetching
    initialDataUpdatedAt: () => {
      return queryClient.getQueryState(queryKeys.crosswalks.all)?.dataUpdatedAt;
    },
  });

  // Fetch the alerts that belong to this crosswalk.
  // Re-fetches whenever the filters (date, danger level, sort) or page number change.
  const {
    data: alertsData = { alerts: [], pagination: { totalPages: 1, totalAlerts: 0, hasMore: false } },
    isLoading: alertsLoading,
    isFetching: alertsFetching,
    error: alertsError,
    refetch: refetchAlerts
  } = useQuery({
    queryKey: queryKeys.crosswalks.alerts(crosswalkId, filters, currentPage),
    queryFn: async () => {
      const response = await crosswalksApi.getAlerts(crosswalkId, {
        startDate: filters.dateRange.startDate,
        endDate: filters.dateRange.endDate,
        dangerLevel: filters.dangerLevel,
        sortBy: filters.sortBy,
        page: currentPage,
        limit: PAGE_SIZE
      });
      return {
        alerts: response.alerts || [],
        pagination: response.pagination || { totalPages: 1, totalAlerts: 0, hasMore: false }
      };
    },
    enabled: !!crosswalkId,
  });

  // Accumulate alerts when data changes
  useEffect(() => {
    if (!alertsData?.alerts?.length && currentPage === 1) {
      setAccumulated([]);
      return;
    }
    if (!alertsData?.alerts) return;

    if (currentPage === 1) {
      setAccumulated(alertsData.alerts);
    } else {
      setAccumulated((prev) => {
        const existingIds = new Set(prev.map((a) => a._id));
        const newItems = alertsData.alerts.filter((a) => !existingIds.has(a._id));
        return [...prev, ...newItems];
      });
    }
  }, [alertsData, currentPage]);

  // Fetch statistics for this specific crosswalk (e.g. total alerts, danger breakdown).
  const {
    data: stats = null,
    isLoading: statsLoading,
    error: statsError
  } = useQuery({
    queryKey: queryKeys.crosswalks.detailStats(crosswalkId),
    queryFn: async () => {
      const response = await crosswalksApi.getCrosswalkStats(crosswalkId);
      return response.data;
    },
    enabled: !!crosswalkId,
  });

  // Apply new filter values and reset to the first page.
  const updateFilters = (newFilters) => {
    setFilters({ ...filters, ...newFilters });
    setAccumulated([]);
    setCurrentPage(1);
  };

  // Reset all filters to their default values and go back to page 1.
  const clearFilters = () => {
    setFilters({
      dateRange: { startDate: null, endDate: null },
      dangerLevel: 'all',
      sortBy: 'newest'
    });
    setAccumulated([]);
    setCurrentPage(1);
  };

  const hasMore = alertsData?.pagination?.hasMore ?? false;
  const loadingMore = currentPage > 1 && alertsFetching;

  const loadMore = useCallback(() => {
    if (hasMore && !alertsFetching) {
      setCurrentPage((p) => p + 1);
    }
  }, [hasMore, alertsFetching]);

  const loading = crosswalkLoading || alertsLoading || statsLoading;

  // Show loading screen only if we don't have crosswalk data at all.
  // Once we have crosswalk (from cache or server), show content even if alerts/stats are loading.
  const isInitialLoading = !crosswalk && (crosswalkLoading || alertsLoading);

  const error = crosswalkError?.message || alertsError?.message || statsError?.message || null;

  return {
    crosswalk,
    alerts: accumulated,
    stats,
    filters,
    updateFilters,
    clearFilters,
    totalAlerts: alertsData.pagination.totalAlerts,
    hasMore,
    loadMore,
    loadingMore,
    loading,
    isInitialLoading,
    error,
    refetch: refetchAlerts
  };
}
