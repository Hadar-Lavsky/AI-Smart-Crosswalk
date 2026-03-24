import { useState } from "react";

/**
 * useDialog — minimal hook for open/close dialog state with an optional item payload.
 *
 * @returns {{ open: boolean, item: any, openCreate: Function, openWith: Function, close: Function }}
 *
 * @example
 * const dialog = useDialog();
 * // open for create:  dialog.openCreate()
 * // open for edit:    dialog.openWith(item)
 * // close:            dialog.close()
 * // read state:       dialog.open, dialog.item
 */
export function useDialog() {
  const [state, setState] = useState({ open: false, item: null });
  return {
    ...state,
    openCreate: () => setState({ open: true, item: null }),
    openWith: (item) => setState({ open: true, item }),
    close: () => setState({ open: false, item: null }),
  };
}
