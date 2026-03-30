import { useState } from "react";

/**
 * useDialog — Dialog state management with optional item payload and submitting state.
 *
 * @returns {{
 *   open: boolean,
 *   item: any | null,
 *   submitting: boolean,
 *   openCreate: () => void,
 *   openWith: (item: any) => void,
 *   close: () => void,
 *   setSubmitting: (value: boolean) => void
 * }}
 *
 * @example
 * const dialog = useDialog();
 * dialog.openCreate();           // Open for create mode
 * dialog.openWith(item);         // Open for edit mode with item
 * dialog.setSubmitting(true);    // Show loading state
 * dialog.close();                // Close dialog
 */
export function useDialog() {
  const [state, setState] = useState({ open: false, item: null });
  const [submitting, setSubmitting] = useState(false);

  return {
    open: state.open,
    item: state.item,
    submitting,
    openCreate: () => setState({ open: true, item: null }),
    openWith: (item) => setState({ open: true, item }),
    close: () => {
      setState({ open: false, item: null });
      setSubmitting(false);
    },
    setSubmitting,
  };
}
