import { useQuery } from "@tanstack/react-query";
import { ledsApi } from "../../api";
import { queryKeys } from "../queryKeys";

/**
 * useLEDList — fetches the LEDs array.
 *
 * @param {object} [options]
 * @param {boolean} [options.autoRefresh=false]    - Poll the server automatically.
 * @param {number}  [options.refreshInterval=10000] - Polling interval in ms.
 * @returns {{ leds: Array, loading: boolean, error: string|null, refetch: Function }}
 */
export function useLEDList({ autoRefresh = false, refreshInterval = 10000 } = {}) {
  const {
    data: leds = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: queryKeys.leds.all,
    queryFn: async () => {
      const response = await ledsApi.getAll();
      return response.data;
    },
    refetchInterval: autoRefresh ? refreshInterval : false,
  });

  return { leds, loading, error: error?.message || null, refetch };
}
