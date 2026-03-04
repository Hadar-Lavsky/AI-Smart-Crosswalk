import { useAlertList } from "./useAlertList";
import { useAlertStats } from "./useAlertStats";
import { useAlertMutations } from "./useAlertMutations";

/**
 * useAlerts — convenience hook that combines list + stats + mutations.
 *
 * @param {boolean} [autoRefresh=true]
 * @param {number}  [refreshInterval=5000]
 */
export function useAlerts(autoRefresh = true, refreshInterval = 5000) {
  const opts = { autoRefresh, refreshInterval };
  const { alerts, loading, loadingMore, hasMore, loadMore, error, refetch } = useAlertList(opts);
  const { stats } = useAlertStats(opts);
  const { createAlert, updateAlert, deleteAlert } = useAlertMutations();

  return {
    alerts, stats, loading, loadingMore, hasMore, loadMore,
    error, refetch, createAlert, updateAlert, deleteAlert,
  };
}
