import { memo } from 'react';
import { Button } from '../ui';
import { formatId, formatDate } from '../../utils';

/**
 * LEDRow — table row for LED systems.
 * Rendered by GenericList when type="led".
 * Shows: ID, Created, Delete button only (no status, no edit).
 *
 * @param {object} props
 * @param {{ _id: string, createdAt?: string }} props.item
 * @param {(id: string) => void} [props.onDelete]
 */
function LEDRowComponent({ item: device, onDelete }) {
  return (
    <tr className="hover:bg-surface-50">
      <td className="py-3 px-4">
        <span className="text-sm font-mono text-surface-600">{formatId(device._id)}</span>
      </td>
      <td className="py-3 px-4 text-sm text-surface-600">
        {formatDate(device.createdAt)}
      </td>
      <td className="py-3 px-4 text-right">
        <div className="flex gap-2 justify-end">
          {onDelete && (
            <Button variant="danger" size="sm" onClick={() => onDelete(device._id)}>Delete</Button>
          )}
        </div>
      </td>
    </tr>
  );
}

export const LEDRow = memo(LEDRowComponent);
LEDRow.displayName = 'LEDRow';
