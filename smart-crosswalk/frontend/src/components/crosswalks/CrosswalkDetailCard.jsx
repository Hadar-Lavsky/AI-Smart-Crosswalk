import { Badge } from '../ui';
import { GenericDetailCard } from '../common/GenericDetailCard';
import { formatId, formatDate, formatStatus } from '../../utils';

/**
 * CrosswalkDetailCard — detail view for a single crosswalk.
 * Used in CrosswalkDetailsPage.
 *
 * @param {object} props
 * @param {object} props.item
 */
export function CrosswalkDetailCard({ item }) {
  const s = formatStatus(item.cameraId?.status);
  const none = (text) => <span className="text-sm text-surface-500">{text}</span>;

  return (
    <GenericDetailCard
      header={{
        icon: '🚦',
        title: `${item.location.street} ${item.location.number}`,
        subtitle: item.location.city,
      }}
      fields={[
        {
          label: 'Created',
          value: formatDate(item.createdAt, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          }),
        },
        {
          label: '📷 Camera',
          component: item.cameraId
            ? <Badge variant={s.variant}>{s.text}</Badge>
            : none('No Camera'),
        },
        {
          label: '💡 LED',
          component: item.ledId
            ? <span className="text-xs font-mono">{formatId(item.ledId._id)}</span>
            : none('No LED'),
        },
      ]}
    />
  );
}
