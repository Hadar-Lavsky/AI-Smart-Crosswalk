import { useMutation, useQueryClient } from "@tanstack/react-query";
import { crosswalksApi } from "../../api";
import { queryKeys } from "../queryKeys";

/**
 * useCrosswalkLinkMutations — link / unlink cameras and LEDs to crosswalks.
 *
 * @returns {{ linkCamera: Function, unlinkCamera: Function, linkLED: Function, unlinkLED: Function }}
 */
export function useCrosswalkLinkMutations() {
  const queryClient = useQueryClient();

  /** Refresh the crosswalks list after a link / unlink action. */
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.crosswalks.all });
  };

  const linkCameraMutation = useMutation({
    mutationFn: ({ id, cameraId }) => crosswalksApi.linkCamera(id, cameraId),
    onSuccess: invalidate,
  });

  const unlinkCameraMutation = useMutation({
    mutationFn: (id) => crosswalksApi.unlinkCamera(id),
    onSuccess: invalidate,
  });

  const linkLEDMutation = useMutation({
    mutationFn: ({ id, ledId }) => crosswalksApi.linkLED(id, ledId),
    onSuccess: invalidate,
  });

  const unlinkLEDMutation = useMutation({
    mutationFn: (id) => crosswalksApi.unlinkLED(id),
    onSuccess: invalidate,
  });

  return {
    /** Attach a camera to a crosswalk by storing the camera ID on it. */
    linkCamera: async (id, cameraId) => linkCameraMutation.mutateAsync({ id, cameraId }),
    /** Remove the camera association from a crosswalk. */
    unlinkCamera: async (id) => unlinkCameraMutation.mutateAsync(id),
    /** Attach an LED device to a crosswalk by storing the LED ID on it. */
    linkLED: async (id, ledId) => linkLEDMutation.mutateAsync({ id, ledId }),
    /** Remove the LED association from a crosswalk. */
    unlinkLED: async (id) => unlinkLEDMutation.mutateAsync(id),
  };
}
