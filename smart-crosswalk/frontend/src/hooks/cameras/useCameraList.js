import { useQuery } from "@tanstack/react-query";
import { camerasApi } from "../../api";
import { queryKeys } from "../queryKeys";

/**
 * useCameraList — fetches the cameras array.
 *
 * @param {object} [options]
 * @param {boolean} [options.autoRefresh=false]    - Poll the server automatically.
 * @param {number}  [options.refreshInterval=10000] - Polling interval in ms.
 * @returns {{ cameras: Array, loading: boolean, error: string|null, refetch: Function }}
 */
export function useCameraList({ autoRefresh = false, refreshInterval = 10000 } = {}) {
  const {
    data: cameras = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.cameras.all,
    queryFn: async () => {
      const response = await camerasApi.getAll();
      return response.data;
    },
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  return { cameras, loading, error: error?.message || null, refetch };
}
