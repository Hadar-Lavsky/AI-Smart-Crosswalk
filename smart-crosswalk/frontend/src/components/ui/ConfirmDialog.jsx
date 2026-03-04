import { Button } from './Button';
import { Dialog, DialogHeader, DialogTitle, DialogContent, DialogFooter } from './Dialog';

/**
 * ConfirmDialog — pre-wired destructive-action confirmation modal.
 * Wraps Dialog with standard Cancel / Confirm buttons and optional
 * loading state while the async action completes.
 *
 * @param {object} props
 * @param {boolean} props.open - Controls visibility
 * @param {() => void} props.onClose - Called when the dialog is dismissed without confirming
 * @param {() => Promise<void>} props.onConfirm - Async action to run on confirmation
 * @param {string} [props.title='Confirm Action']
 * @param {string} [props.message='Are you sure?']
 * @param {string} [props.confirmText='Confirm']
 * @param {string} [props.cancelText='Cancel']
 * @param {'primary'|'secondary'|'danger'|'success'|'ghost'} [props.variant='danger'] - Button variant for the confirm button
 * @param {boolean} [props.loading=false] - Shows spinner on the confirm button while the action runs
 *
 * @example
 * <ConfirmDialog
 *   open={open} onClose={close} onConfirm={handleDelete}
 *   title="Delete Crosswalk" message="This cannot be undone."
 *   confirmText="Delete" variant="danger"
 * />
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure?',
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  loading = false
}) {
  const handleConfirm = async () => {
    await onConfirm();
    if (!loading) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="max-w-md">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
      </DialogHeader>
      
      <DialogContent>
        <p className="text-surface-700">{message}</p>
      </DialogContent>
      
      <DialogFooter>
        <Button 
          variant="ghost" 
          onClick={onClose}
          disabled={loading}
        >
          {cancelText}
        </Button>
        <Button 
          variant={variant}
          onClick={handleConfirm}
          loading={loading}
        >
          {confirmText}
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
