import { useMutation, useQueryClient } from "@tanstack/react-query";
import { alertsApi } from "../../api";
import { queryKeys } from "../queryKeys";

/**
 * useAlertMutations — create, update, and delete alerts.
 * Invalidates both the alerts list and stats caches on success.
 *
 * @returns {{ createAlert: Function, updateAlert: Function, deleteAlert: Function }}
 */
export function useAlertMutations() {
  const queryClient = useQueryClient();

  /** Invalidate everything alert-related after a successful mutation. */
  const invalidateAlerts = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.alerts.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.alerts.stats });
  };

  const createMutation = useMutation({
    mutationFn: (data) => alertsApi.create(data),
    onSuccess: invalidateAlerts,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => alertsApi.update(id, data),
    onSuccess: invalidateAlerts,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => alertsApi.delete(id),
    onSuccess: invalidateAlerts,
  });

  return {
    /** Create a new alert record in the database. */
    createAlert: async (data) => createMutation.mutateAsync(data),
    /** Update the details of an existing alert. */
    updateAlert: async (id, data) => updateMutation.mutateAsync({ id, data }),
    /** Permanently delete an alert from the database. */
    deleteAlert: async (id) => deleteMutation.mutateAsync(id),
  };
}
