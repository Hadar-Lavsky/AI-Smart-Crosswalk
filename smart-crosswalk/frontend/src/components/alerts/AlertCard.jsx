import { memo } from 'react';
import { Badge } from '../ui';
import { GenericDetailCard } from '../common/GenericDetailCard';
import {
  formatId,
  formatLocation,
  formatDate,
  formatDangerLevel,
  getImageUrl,
} from '../../utils';

/**
 * AlertCard — list card for alerts.
 * Rendered by GenericList when type="alert".
 *
 * @param {object} props
 * @param {object} props.item
 * @param {(item: object) => void} [props.onEdit]
 * @param {(item: object) => void} [props.onDelete]
 */
function AlertCardComponent({ item, index, onEdit, onDelete }) {
  const dl = formatDangerLevel(item.dangerLevel);
  const indexLabel = index != null ? `#${index + 1} ` : '';

  return (
    <GenericDetailCard
      className={`border-l-4 ${dl.border}`}
      header={{
        icon: dl.icon,
        title: `${indexLabel}${dl.label} Danger Alert`,
        subtitle: item.crosswalkId?.location
          ? formatLocation(item.crosswalkId.location)
          : undefined,
      }}
      image={{
        url: getImageUrl(item.imageUrl),
        alt: 'Detection',
        fallbackIcon: '📷',
      }}
      fields={[
        {
          label: 'Danger Level',
          component: <Badge variant={dl.variant}>{dl.label} Danger</Badge>,
        },
        { label: 'Detected', value: formatDate(item.timestamp || item.createdAt) },
        { label: 'Camera', value: formatId(item.crosswalkId?.cameraId?._id) },
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

export const AlertCard = memo(AlertCardComponent);
AlertCard.displayName = 'AlertCard';
