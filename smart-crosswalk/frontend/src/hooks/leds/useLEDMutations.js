import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ledsApi } from "../../api";
import { queryKeys } from "../queryKeys";

/**
 * useLEDMutations — create and delete LEDs.
 * Also invalidates the crosswalks cache because LEDs are linked to crosswalks.
 *
 * @returns {{ createLED: Function, deleteLED: Function }}
 */
export function useLEDMutations() {
  const queryClient = useQueryClient();

  /** Refresh LEDs and crosswalks after a mutation. */
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.leds.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.crosswalks.all });
  };

  const createMutation = useMutation({
    mutationFn: (data) => ledsApi.create(data),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => ledsApi.delete(id),
    onSuccess: invalidate,
  });

  return {
    /** Create a new LED device record in the database. */
    createLED: async (data) => createMutation.mutateAsync(data),
    /** Permanently delete an LED device from the database. */
    deleteLED: async (id) => deleteMutation.mutateAsync(id),
  };
}
