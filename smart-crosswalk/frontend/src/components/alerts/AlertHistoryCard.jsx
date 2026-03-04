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
 * AlertHistoryCard — history variant of alert card.
 * Used in CrosswalkDetailsPage for events history.
 * Has "View Details" and "Download Image" actions instead of edit/delete.
 *
 * @param {object} props
 * @param {object} props.item
 * @param {(item: object) => void} [props.onViewDetails]
 */
function AlertHistoryCardComponent({ item, index, onViewDetails }) {
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
          : formatDate(item.timestamp),
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
        {
          label: 'Alert ID',
          value: formatId(item._id),
          valueClassName: 'text-gray-500 font-mono ml-2',
          break: true,
        },
      ]}
      actions={[
        onViewDetails && {
          label: 'View Details',
          onClick: () => onViewDetails(item),
        },
        item.imageUrl && {
          label: 'Download Image',
          href: getImageUrl(item.imageUrl),
          target: '_blank',
          rel: 'noopener noreferrer',
          variant: 'secondary',
        },
      ].filter(Boolean)}
    />
  );
}

export const AlertHistoryCard = memo(AlertHistoryCardComponent);
AlertHistoryCard.displayName = 'AlertHistoryCard';
