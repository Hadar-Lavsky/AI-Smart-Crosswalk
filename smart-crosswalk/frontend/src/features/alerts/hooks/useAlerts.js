import { useAlertList } from "./useAlertList";
import { useAlertStats } from "./useAlertStats";
import { useAlertMutations } from "./useAlertMutations";

/**
 * useAlerts — convenience hook that combines list + stats + mutations.
 *
 * @param {object}  [options]
 * @param {boolean} [options.autoRefresh=true]
 * @param {number}  [options.refreshInterval=5000]
 * @param {object}  [options.filters] - Server-side list filters: { dangerLevel, crosswalkSearch, dateRange }.
 */
export function useAlerts({ autoRefresh = true, refreshInterval = 5000, filters } = {}) {
  const { alerts, loading, loadingMore, hasMore, loadMore, error, refetch } =
    useAlertList({ autoRefresh, refreshInterval, filters });
  const { stats } = useAlertStats({ autoRefresh, refreshInterval });
  const { createAlert, updateAlert, deleteAlert } = useAlertMutations();

  return {
    alerts, stats, loading, loadingMore, hasMore, loadMore,
    error, refetch, createAlert, updateAlert, deleteAlert,
  };
}
