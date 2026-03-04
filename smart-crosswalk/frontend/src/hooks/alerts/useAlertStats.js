import { useQuery } from "@tanstack/react-query";
import { alertsApi } from "../../api";
import { queryKeys } from "../queryKeys";

/**
 * useAlertStats — fetches only the alert statistics (total / low / medium / high).
 * Use this when you just need counts and do NOT need the full alerts array.
 *
 * @param {object} [options]
 * @param {boolean} [options.autoRefresh=true]
 * @param {number}  [options.refreshInterval=5000]
 * @returns {{ stats: { total: number, low: number, medium: number, high: number }, loading: boolean }}
 */
export function useAlertStats({ autoRefresh = true, refreshInterval = 5000 } = {}) {
  const {
    data: stats = { total: 0, low: 0, medium: 0, high: 0 },
    isLoading: loading,
  } = useQuery({
    queryKey: queryKeys.alerts.stats,
    queryFn: async () => {
      const response = await alertsApi.getStats();
      return response.data;
    },
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  return { stats, loading };
}
