import { useMutation, useQueryClient } from "@tanstack/react-query";
import { crosswalksApi } from "../../api";
import { queryKeys } from "../queryKeys";

/**
 * useCrosswalkMutations — create, update, and delete crosswalks.
 *
 * @returns {{ createCrosswalk: Function, updateCrosswalk: Function, deleteCrosswalk: Function }}
 */
export function useCrosswalkMutations() {
  const queryClient = useQueryClient();

  /** Invalidate the crosswalks list and stats after a mutation. */
  const invalidateCrosswalks = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.crosswalks.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.crosswalks.stats });
  };

  const createMutation = useMutation({
    mutationFn: (data) => crosswalksApi.create(data),
    onSuccess: invalidateCrosswalks,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => crosswalksApi.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.crosswalks.all }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => crosswalksApi.delete(id),
    onSuccess: invalidateCrosswalks,
  });

  return {
    /** Create a new crosswalk record in the database. */
    createCrosswalk: async (data) => createMutation.mutateAsync(data),
    /** Update the details of an existing crosswalk. */
    updateCrosswalk: async (id, data) => updateMutation.mutateAsync({ id, data }),
    /** Permanently delete a crosswalk from the database. */
    deleteCrosswalk: async (id) => deleteMutation.mutateAsync(id),
  };
}
