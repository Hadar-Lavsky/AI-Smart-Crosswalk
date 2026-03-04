import { FormDialog, useFormState } from '../common/FormDialog';

const initialState = () => ({});

/**
 * LEDDialog — create LED system dialog.
 * Minimal — just a confirmation dialog with a description.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {object} [props.item]
 * @param {() => void} props.onClose
 * @param {(data: object) => void} props.onSubmit
 * @param {boolean} [props.loading]
 */
export function LEDDialog({ open, item, onClose, onSubmit, loading }) {
  const [formData, handleFieldChange] = useFormState(initialState, item, open);

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(formData);
      }}
      title="Add New LED System"
      submitText="Create LED System"
      description="A new LED system will be created and ready to be linked to a crosswalk."
      formData={formData}
      onFieldChange={handleFieldChange}
      loading={loading}
      sections={[]}
    />
  );
}
