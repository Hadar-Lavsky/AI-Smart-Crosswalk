import { FormDialog, useFormState } from '../common/FormDialog';

const DANGER_LEVEL_OPTIONS = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

// Converts empty-string crosswalkId to null before submitting.
const nullifyCrosswalkId = (fd) =>
  Object.fromEntries(
    Object.entries(fd).map(([k, v]) => [
      k,
      k === 'crosswalkId' && v === '' ? null : v,
    ]),
  );

const initialState = (item) => ({
  crosswalkId: item?.crosswalkId?._id || '',
  dangerLevel: item?.dangerLevel || 'LOW',
  imageUrl: item?.imageUrl || '',
});

/**
 * AlertDialog — create/edit alert form dialog.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {object} [props.item]
 * @param {() => void} props.onClose
 * @param {(data: object) => void} props.onSubmit
 * @param {boolean} [props.loading]
 * @param {Array} [props.crosswalks]
 */
export function AlertDialog({ open, item, onClose, onSubmit, loading, crosswalks = [] }) {
  const isEdit = Boolean(item);
  const [formData, handleFieldChange] = useFormState(initialState, item, open);

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(nullifyCrosswalkId(formData));
      }}
      title={isEdit ? 'Edit Alert' : 'Add New Alert'}
      submitText={isEdit ? 'Save Changes' : 'Add Alert'}
      formData={formData}
      onFieldChange={handleFieldChange}
      loading={loading}
      sections={[
        {
          fields: [
            {
              type: 'select',
              label: 'Crosswalk',
              key: 'crosswalkId',
              options: crosswalks.map((cw) => ({
                value: cw._id,
                label: `${cw.location.city}, ${cw.location.street} ${cw.location.number}`,
              })),
              required: true,
              disabled: Boolean(item),
              placeholder: 'Select a crosswalk',
            },
            {
              type: 'select',
              label: 'Danger Level',
              key: 'dangerLevel',
              options: DANGER_LEVEL_OPTIONS,
              required: true,
            },
            {
              type: 'input',
              label: 'Photo URL',
              key: 'imageUrl',
              inputType: 'url',
              placeholder: 'https://example.com/photo.jpg',
              required: true,
            },
          ],
        },
      ]}
    />
  );
}
