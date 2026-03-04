import { TabDialog } from '../common/FormDialog';
import { formatId, formatStatus } from '../../utils';
import { Badge } from '../ui';

/**
 * CrosswalkEditDialog — tabbed edit dialog for crosswalks.
 * Three tabs: Location (form), Camera (device), LED (device).
 *
 * @param {object} props
 * @param {boolean} props.open
 * @param {object} [props.item]
 * @param {() => void} props.onClose
 * @param {boolean} [props.loading]
 * @param {Array} [props.cameras]
 * @param {Array} [props.leds]
 * @param {(id: string, data: object) => void} [props.onUpdate]
 * @param {(id: string, cameraId: string) => void} [props.onLinkCamera]
 * @param {(id: string) => void} [props.onUnlinkCamera]
 * @param {(id: string, ledId: string) => void} [props.onLinkLED]
 * @param {(id: string) => void} [props.onUnlinkLED]
 * @param {() => void} [props.onCreateCamera]
 * @param {() => void} [props.onCreateLED]
 */
export function CrosswalkEditDialog({
  open,
  item,
  onClose,
  loading,
  cameras = [],
  leds = [],
  onUpdate,
  onLinkCamera,
  onUnlinkCamera,
  onLinkLED,
  onUnlinkLED,
  onCreateCamera,
  onCreateLED,
}) {
  const context = {
    cameras,
    leds,
    onUpdate,
    onLinkCamera,
    onUnlinkCamera,
    onLinkLED,
    onUnlinkLED,
    onCreateCamera,
    onCreateLED,
  };

  const tabsConfig = {
    title: 'Edit Crosswalk',
    getSubtitle: (cw) =>
      `${cw.location?.city}, ${cw.location?.street} ${cw.location?.number}`,
    tabs: [
      {
        id: 'location',
        label: '📍 Location',
        type: 'form',
        sectionTitle: '📍 Update Location Details',
        formFields: [
          { key: 'city', label: 'City', required: true },
          { key: 'street', label: 'Street', required: true },
          { key: 'number', label: 'Number', required: true },
        ],
        initState: (cw) => ({
          city: cw.location?.city || '',
          street: cw.location?.street || '',
          number: cw.location?.number || '',
        }),
        onSubmit: (cw, state, ctx) =>
          ctx.onUpdate(cw._id, { location: state }),
        submitLabel: 'Save Changes',
      },
      {
        id: 'camera',
        label: '📷 Camera',
        type: 'device',
        deviceKey: 'cameraId',
        sectionTitle: '📷 Camera Management',
        getDeviceCard: (device) => ({
          header: {
            icon: '📷',
            title: `Camera ${formatId(device._id)}`,
            subtitle: 'Linked',
          },
          fields: [
            device.status && {
              label: 'Status',
              component: (
                <Badge variant={formatStatus(device.status).variant}>
                  {formatStatus(device.status).text}
                </Badge>
              ),
            },
          ].filter(Boolean),
        }),
        getOptions: (ctx) =>
          (ctx.cameras || []).map((c) => ({
            value: c._id,
            label: `Camera ${formatId(c._id)} - ${c.status}`,
          })),
        selectLabel: 'Select New Camera',
        selectPlaceholder: 'Select camera...',
        onLink: (cw, id, ctx) => ctx.onLinkCamera(cw._id, id),
        onUnlink: (cw, ctx) => ctx.onUnlinkCamera(cw._id),
        onCreate: (ctx) => ctx.onCreateCamera(),
        linkLabel: '🔗 Link Camera',
        createLabel: '➕ Add New Camera',
      },
      {
        id: 'led',
        label: '💡 LED',
        type: 'device',
        deviceKey: 'ledId',
        sectionTitle: '💡 LED Management',
        getDeviceCard: (device) => ({
          header: {
            icon: '💡',
            title: `LED ${formatId(device._id)}`,
            subtitle: 'Linked',
          },
          fields: [],
        }),
        getOptions: (ctx) =>
          (ctx.leds || []).map((l) => ({
            value: l._id,
            label: `LED ${formatId(l._id)}`,
          })),
        selectLabel: 'Select New LED',
        selectPlaceholder: 'Select LED...',
        onLink: (cw, id, ctx) => ctx.onLinkLED(cw._id, id),
        onUnlink: (cw, ctx) => ctx.onUnlinkLED(cw._id),
        onCreate: (ctx) => ctx.onCreateLED(),
        linkLabel: '🔗 Link LED',
        createLabel: '➕ Add New LED',
      },
    ],
  };

  return (
    <TabDialog
      tabsConfig={tabsConfig}
      item={item}
      open={open}
      onClose={onClose}
      loading={loading}
      context={context}
    />
  );
}
