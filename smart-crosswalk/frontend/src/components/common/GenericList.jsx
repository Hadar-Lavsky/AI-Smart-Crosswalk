import { Card, Button } from '../ui';
import { GenericDetailCard } from './GenericDetailCard';
import { CrosswalkCard } from '../crosswalks/CrosswalkCard';
import { AlertCard } from '../alerts/AlertCard';
import { AlertHistoryCard } from '../alerts/AlertHistoryCard';
import { CameraRow } from '../cameras/CameraRow';
import { LEDRow } from '../leds/LEDRow';

// ─── Registry ─────────────────────────────────────────────────────────────────
// Maps type → { component, layout, columns? }

const registry = {
  crosswalk:       { component: CrosswalkCard,    layout: 'card' },
  alert:           { component: AlertCard,        layout: 'card' },
  'alert-history': { component: AlertHistoryCard, layout: 'card' },
  camera:          { component: CameraRow,        layout: 'table', columns: ['ID', 'Status', 'Created', 'Actions'] },
  led:             { component: LEDRow,           layout: 'table', columns: ['ID', 'Created', 'Actions'] },
};

// ─── GenericList ──────────────────────────────────────────────────────────────

/**
 * GenericList — renders a list of items based on `type`.
 *
 * Looks up `type` in the registry to determine which component to render
 * and whether to use a card layout or table layout.
 *
 * @param {object} props
 * @param {'crosswalk'|'alert'|'alert-history'|'camera'|'led'} props.type - Registry key
 * @param {object[]} props.data - Array of items to render
 * @param {string} [props.emptyIcon='📭'] - Icon shown in the empty state card
 * @param {string} [props.emptyTitle='No Items'] - Title shown in the empty state card
 * @param {string} [props.emptyMessage='No items found.'] - Message shown in the empty state card
 * @param {string} [props.emptyActionLabel] - Optional action button label in empty state
 * @param {() => void} [props.onEmptyAction] - Optional action button handler in empty state
 * @param {string} [props.className='space-y-4'] - Wrapper className for card lists
 * @param {boolean} [props.hasMore] - Whether more items can be loaded
 * @param {() => void} [props.onLoadMore] - Callback to load more items
 * @param {boolean} [props.loadingMore] - Whether more items are currently loading
 *
 * All other props (onEdit, onDelete, onClick, onViewDetails, etc.) are
 * forwarded to each item component.
 *
 * @example
 * <GenericList type="crosswalk" data={crosswalks} onEdit={handleEdit} onDelete={handleDelete}
 *   emptyIcon="🚦" emptyTitle="No Crosswalks" emptyMessage="Add your first crosswalk." />
 */
export function GenericList({
  type,
  data = [],
  emptyIcon = '📭',
  emptyTitle = 'No Items',
  emptyMessage = 'No items found.',
  emptyActionLabel,
  onEmptyAction,
  className = 'space-y-4',
  hasMore,
  onLoadMore,
  loadingMore,
  ...itemProps
}) {
  const entry = registry[type];

  if (!entry) {
    return (
      <Card className="bg-red-50 border-red-200">
        <div className="p-4 text-red-800">
          <strong>Error:</strong> Unknown component type &quot;{type}&quot;
        </div>
      </Card>
    );
  }

  const { component: ItemComponent, layout, columns = [] } = entry;
  const isTable = layout === 'table';

  // Empty state
  if (data.length === 0) {
    return (
      <GenericDetailCard
        header={{ icon: emptyIcon, title: emptyTitle }}
        fields={[{ value: emptyMessage, valueClassName: 'text-surface-500' }]}
        actions={emptyActionLabel && onEmptyAction
          ? [{ label: emptyActionLabel, variant: 'secondary', onClick: onEmptyAction }]
          : []
        }
      />
    );
  }

  const loadMoreButton = hasMore && onLoadMore && (
    <div className="flex justify-center pt-4">
      <Button
        variant="secondary"
        onClick={onLoadMore}
        disabled={loadingMore}
      >
        {loadingMore ? 'Loading...' : 'Load More'}
      </Button>
    </div>
  );

  // Table layout
  if (isTable) {
    return (
      <>
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-200">
                  {columns.map((col) => (
                    <th
                      key={col}
                      className={`text-left py-3 px-4 text-sm font-medium text-surface-700 ${col === 'Actions' ? 'text-right' : ''}`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-100">
                {data.map((item, index) => (
                  <ItemComponent
                    key={item._id || item.id}
                    item={item}
                    index={index}
                    {...itemProps}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
        {loadMoreButton}
      </>
    );
  }

  // Card layout
  return (
    <div className={className}>
      {data.map((item, index) => (
        <div key={item._id || item.id}>
          <ItemComponent item={item} index={index} {...itemProps} />
        </div>
      ))}
      {loadMoreButton}
    </div>
  );
}
