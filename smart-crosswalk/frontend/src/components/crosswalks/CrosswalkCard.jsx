import { memo } from 'react';
import { Badge } from '../ui';
import { GenericDetailCard } from '../common/GenericDetailCard';
import { formatId, formatLocation, formatStatus } from '../../utils';

/**
 * CrosswalkCard — list card for crosswalks.
 * Rendered by GenericList when type="crosswalk".
 *
 * @param {object} props
 * @param {object} props.item
 * @param {(item: object) => void} [props.onEdit]
 * @param {(item: object) => void} [props.onDelete]
 * @param {(item: object) => void} [props.onClick]
 */
function CrosswalkCardComponent({ item, onEdit, onDelete, onClick }) {
  const s = formatStatus(item.cameraId?.status);

  return (
    <GenericDetailCard
      onClick={onClick ? () => onClick(item) : undefined}
      header={{
        icon: '🚦',
        title: item.location?.city || 'Unknown City',
        subtitle: formatLocation(item.location),
      }}
      fields={[
        { label: 'Camera ID', value: formatId(item.cameraId?._id) },
        { label: 'LED ID', value: formatId(item.ledId?._id) },
        {
          label: 'Camera Status',
          component: <Badge variant={s.variant}>{s.text}</Badge>,
        },
      ]}
      actions={[
        onEdit && {
          label: '✏️ Edit',
          variant: 'ghost',
          onClick: (e) => { e.stopPropagation(); onEdit(item); },
        },
        onDelete && {
          label: '🗑️ Delete',
          variant: 'danger',
          onClick: (e) => { e.stopPropagation(); onDelete(item); },
        },
      ].filter(Boolean)}
    />
  );
}

export const CrosswalkCard = memo(CrosswalkCardComponent);
CrosswalkCard.displayName = 'CrosswalkCard';
