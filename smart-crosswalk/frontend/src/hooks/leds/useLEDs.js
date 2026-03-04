import { useLEDList } from "./useLEDList";
import { useLEDMutations } from "./useLEDMutations";

/**
 * useLEDs — convenience hook that combines list + mutations.
 *
 * @param {object} [options]
 * @param {boolean} [options.autoRefresh=false]
 * @param {number}  [options.refreshInterval=10000]
 */
export function useLEDs(options = {}) {
  const { leds, loading, error, refetch } = useLEDList(options);
  const { createLED, deleteLED } = useLEDMutations();

  return { leds, loading, error, refetch, createLED, deleteLED };
}
