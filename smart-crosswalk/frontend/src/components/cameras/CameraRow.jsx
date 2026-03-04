import { memo } from 'react';
import { Badge, Button } from '../ui';
import { formatId, formatDate, formatStatus } from '../../utils';

/**
 * CameraRow — table row for cameras.
 * Rendered by GenericList when type="camera".
 * Always shows: ID, Status, Created, Edit + Delete buttons.
 *
 * @param {object} props
 * @param {{ _id: string, status?: string, createdAt?: string }} props.item
 * @param {(device: object) => void} [props.onEdit]
 * @param {(id: string) => void} [props.onDelete]
 */
function CameraRowComponent({ item: device, onEdit, onDelete }) {
  const s = formatStatus(device.status);

  return (
    <tr className="hover:bg-surface-50">
      <td className="py-3 px-4">
        <span className="text-sm font-mono text-surface-600">{formatId(device._id)}</span>
      </td>
      <td className="py-3 px-4">
        <Badge variant={s.variant}>{s.text}</Badge>
      </td>
      <td className="py-3 px-4 text-sm text-surface-600">
        {formatDate(device.createdAt)}
      </td>
      <td className="py-3 px-4 text-right">
        <div className="flex gap-2 justify-end">
          {onEdit && (
            <Button variant="secondary" size="sm" onClick={() => onEdit(device)}>Edit</Button>
          )}
          {onDelete && (
            <Button variant="danger" size="sm" onClick={() => onDelete(device._id)}>Delete</Button>
          )}
        </div>
      </td>
    </tr>
  );
}

export const CameraRow = memo(CameraRowComponent);
CameraRow.displayName = 'CameraRow';
