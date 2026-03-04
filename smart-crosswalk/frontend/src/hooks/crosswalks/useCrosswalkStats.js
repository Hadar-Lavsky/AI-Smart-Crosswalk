import { useQuery } from "@tanstack/react-query";
import { crosswalksApi } from "../../api";
import { queryKeys } from "../queryKeys";

/**
 * useCrosswalkStats — fetches only the crosswalk statistics.
 * Use this when you just need the total count and do NOT need the full array.
 *
 * @returns {{ stats: { total: number }, loading: boolean }}
 */
export function useCrosswalkStats() {
  const {
    data: stats = { total: 0 },
    isLoading: loading,
  } = useQuery({
    queryKey: queryKeys.crosswalks.stats,
    queryFn: async () => {
      const response = await crosswalksApi.getStats();
      return response.data;
    },
  });

  return { stats, loading };
}
