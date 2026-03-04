import { FormDialog, useFormState } from '../common/FormDialog';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'error', label: 'Error' },
];

const initialState = (item) => ({ status: item?.status || 'active' });

/**
 * CameraDialog — create/edit camera form dialog.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {object} [props.item]
 * @param {() => void} props.onClose
 * @param {(data: object) => void} props.onSubmit
 * @param {boolean} [props.loading]
 */
export function CameraDialog({ open, item, onClose, onSubmit, loading }) {
  const isEdit = Boolean(item);
  const [formData, handleFieldChange] = useFormState(initialState, item, open);

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(formData);
      }}
      title={isEdit ? 'Edit Camera' : 'Add New Camera'}
      submitText={isEdit ? 'Update Camera' : 'Create Camera'}
      formData={formData}
      onFieldChange={handleFieldChange}
      loading={loading}
      sections={[
        {
          fields: [
            {
              type: 'select',
              label: 'Status',
              key: 'status',
              options: STATUS_OPTIONS,
              required: true,
            },
          ],
        },
      ]}
    />
  );
}
