import { useCameraList } from "./useCameraList";
import { useCameraMutations } from "./useCameraMutations";

/**
 * useCameras — convenience hook that combines list + mutations.
 *
 * @param {object} [options]
 * @param {boolean} [options.autoRefresh=false]
 * @param {number}  [options.refreshInterval=10000]
 */
export function useCameras(options = {}) {
  const { cameras, loading, error, refetch } = useCameraList(options);
  const { createCamera, updateCameraStatus, deleteCamera } = useCameraMutations();

  return { cameras, loading, error, refetch, createCamera, updateCameraStatus, deleteCamera };
}
