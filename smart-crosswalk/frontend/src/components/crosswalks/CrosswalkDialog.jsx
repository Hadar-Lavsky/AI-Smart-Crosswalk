import { FormDialog, useFormState } from '../common/FormDialog';
import { formatId } from '../../utils';

// Converts empty-string IDs to null before submitting (MongoDB rejects empty strings as ObjectIds).
const nullifyIds = (fd) =>
  Object.fromEntries(
    Object.entries(fd).map(([k, v]) => [
      k,
      ['cameraId', 'ledId'].includes(k) && v === '' ? null : v,
    ]),
  );

const initialState = (item) => ({
  location: {
    city: item?.location?.city || '',
    street: item?.location?.street || '',
    number: item?.location?.number || '',
  },
  cameraId: item?.cameraId?._id || '',
  ledId: item?.ledId?._id || '',
});

/**
 * CrosswalkDialog — create crosswalk form dialog.
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {object} [props.item]
 * @param {() => void} props.onClose
 * @param {(data: object) => void} props.onSubmit
 * @param {boolean} [props.loading]
 * @param {Array} [props.cameras]
 * @param {Array} [props.leds]
 */
export function CrosswalkDialog({ open, item, onClose, onSubmit, loading, cameras = [], leds = [] }) {
  const [formData, handleFieldChange] = useFormState(initialState, item, open);

  return (
    <FormDialog
      open={open}
      onClose={onClose}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(nullifyIds(formData));
      }}
      title="Add New Crosswalk"
      submitText="Create Crosswalk"
      maxWidth="max-w-2xl"
      formData={formData}
      onFieldChange={handleFieldChange}
      loading={loading}
      sections={[
        {
          title: '📍 Location Details',
          fields: [
            { type: 'input', label: 'City', key: 'location.city', placeholder: 'Tel Aviv', required: true },
            { type: 'input', label: 'Street', key: 'location.street', placeholder: 'Dizengoff', required: true },
            { type: 'input', label: 'Number', key: 'location.number', placeholder: '50', required: true },
          ],
        },
        {
          title: '📷 Camera',
          fields: [
            {
              type: 'select',
              label: 'Select Camera',
              key: 'cameraId',
              options: cameras.map((c) => ({
                value: c._id,
                label: `Camera ${formatId(c._id)} - ${c.status}`,
              })),
              placeholder: 'Select camera...',
              hint: 'You can assign a camera after creating the crosswalk',
            },
          ],
        },
        {
          title: '💡 LED Lighting',
          fields: [
            {
              type: 'select',
              label: 'Select LED',
              key: 'ledId',
              options: leds.map((l) => ({
                value: l._id,
                label: `LED ${formatId(l._id)}`,
              })),
              placeholder: 'Select LED...',
              hint: 'You can assign an LED after creating the crosswalk',
            },
          ],
        },
      ]}
    />
  );
}
