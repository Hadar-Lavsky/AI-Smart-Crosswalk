import { useMutation, useQueryClient } from "@tanstack/react-query";
import { camerasApi } from "../../api";
import { queryKeys } from "../queryKeys";

/**
 * useCameraMutations — create, update status, and delete cameras.
 * Also invalidates the crosswalks cache because cameras are linked to crosswalks.
 *
 * @returns {{ createCamera: Function, updateCameraStatus: Function, deleteCamera: Function }}
 */
export function useCameraMutations() {
  const queryClient = useQueryClient();

  /** Refresh cameras and crosswalks after a mutation. */
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.cameras.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.crosswalks.all });
  };

  const createMutation = useMutation({
    mutationFn: (data) => camerasApi.create(data),
    onSuccess: invalidate,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => camerasApi.updateStatus(id, status),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => camerasApi.delete(id),
    onSuccess: invalidate,
  });

  return {
    /** Create a new camera record in the database. */
    createCamera: async (data) => createMutation.mutateAsync(data),
    /** Change a camera's status (e.g. mark it as active or inactive). */
    updateCameraStatus: async (id, status) => updateStatusMutation.mutateAsync({ id, status }),
    /** Permanently delete a camera from the database. */
    deleteCamera: async (id) => deleteMutation.mutateAsync(id),
  };
}
