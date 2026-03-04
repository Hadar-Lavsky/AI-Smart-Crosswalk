import { useState } from 'react';
import {
  PageHeader,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  StatusIndicator,
  ConfirmDialog,
} from '../components/ui';
import { useToast } from '../components/ui';
import { StatsGrid } from '../components/common/StatsGrid';
import { GenericDetailCard } from '../components/common/GenericDetailCard';
import { GenericList } from '../components/common/GenericList';
import { CameraDialog } from '../components/cameras';
import { LEDDialog } from '../components/leds';
import {
  useAlertStats,
  useCrosswalkStats,
  useCameraList,
  useCameraMutations,
  useLEDList,
  useLEDMutations,
} from '../hooks';

/**
 * Dashboard — top-level overview page.
 *
 * Displays aggregate stats (alerts + crosswalks), a system-status card,
 * quick action buttons to add a Camera or LED, and an optional toggleable device
 * management grid (Cameras + LEDs).
 *
 * Route: `/`
 */
export function Dashboard() {
  const { stats: alertStats } = useAlertStats();
  const { stats: crosswalkStats } = useCrosswalkStats();

  const { cameras } = useCameraList();
  const { createCamera, updateCameraStatus, deleteCamera } = useCameraMutations();
  const { leds } = useLEDList();
  const { createLED, deleteLED } = useLEDMutations();

  const { addToast } = useToast();
  const [showDevices, setShowDevices] = useState(false);

  // Camera CRUD state
  const [cameraForm, setCameraForm] = useState({ open: false, item: null });
  const [cameraDelete, setCameraDelete] = useState({ open: false, item: null });
  const [cameraSubmitting, setCameraSubmitting] = useState(false);

  const handleCameraCreate = () => setCameraForm({ open: true, item: null });
  const handleCameraEdit = (item) => setCameraForm({ open: true, item });
  const handleCameraDelete = (item) => setCameraDelete({ open: true, item });
  const closeCameraForm = () => setCameraForm({ open: false, item: null });
  const closeCameraDelete = () => setCameraDelete({ open: false, item: null });

  const handleCameraSubmit = async (formData) => {
    setCameraSubmitting(true);
    try {
      if (cameraForm.item) {
        await updateCameraStatus(cameraForm.item._id, formData.status);
        addToast('Camera updated successfully', 'success');
      } else {
        await createCamera(formData);
        addToast('Camera created successfully', 'success');
      }
      closeCameraForm();
    } catch (err) {
      addToast(err.message || 'Error saving camera', 'error');
    } finally {
      setCameraSubmitting(false);
    }
  };

  const handleCameraConfirmDelete = async () => {
    setCameraSubmitting(true);
    try {
      await deleteCamera(cameraDelete.item._id);
      addToast('Camera deleted successfully', 'success');
      closeCameraDelete();
    } catch (err) {
      addToast(err.message || 'Error deleting camera', 'error');
    } finally {
      setCameraSubmitting(false);
    }
  };

  // LED CRUD state
  const [ledForm, setLEDForm] = useState({ open: false, item: null });
  const [ledDelete, setLEDDelete] = useState({ open: false, item: null });
  const [ledSubmitting, setLEDSubmitting] = useState(false);

  const handleLEDCreate = () => setLEDForm({ open: true, item: null });
  const handleLEDDelete = (item) => setLEDDelete({ open: true, item });
  const closeLEDForm = () => setLEDForm({ open: false, item: null });
  const closeLEDDelete = () => setLEDDelete({ open: false, item: null });

  const handleLEDSubmit = async (formData) => {
    setLEDSubmitting(true);
    try {
      await createLED(formData);
      addToast('LED created successfully', 'success');
      closeLEDForm();
    } catch (err) {
      addToast(err.message || 'Error saving LED', 'error');
    } finally {
      setLEDSubmitting(false);
    }
  };

  const handleLEDConfirmDelete = async () => {
    setLEDSubmitting(true);
    try {
      await deleteLED(ledDelete.item._id);
      addToast('LED deleted successfully', 'success');
      closeLEDDelete();
    } catch (err) {
      addToast(err.message || 'Error deleting LED', 'error');
    } finally {
      setLEDSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Real-time overview of the Smart Crosswalk System"
      />

      <StatsGrid
        stats={[
          { title: 'Total Alerts', value: alertStats.total, icon: '📋', color: 'primary' },
          { title: 'Total Crosswalks', value: crosswalkStats.total, icon: '🚦', color: 'success' },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <GenericDetailCard
          header={{ icon: '🖥', title: 'System Status' }}
          fields={[
            { label: 'API Server', component: <StatusIndicator status="online" label="Online" /> },
            { label: 'Database', component: <StatusIndicator status="connected" label="Connected" /> },
            { label: 'YOLO Detection', component: <StatusIndicator status="connected" label="Connected" /> },
          ]}
        />

        <Card>
          <CardHeader>
            <CardTitle>⚡ Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                onClick={handleCameraCreate}
                className="flex flex-col items-center gap-1 p-4 h-auto border-2 border-primary-200 bg-primary-50 hover:bg-primary-100 text-primary-700"
              >
                <span className="text-2xl">📷</span>
                <span className="text-sm font-medium">Add Camera</span>
              </Button>
              <Button
                variant="secondary"
                onClick={handleLEDCreate}
                className="flex flex-col items-center gap-1 p-4 h-auto border-2 border-success-200 bg-success-50 hover:bg-success-100 text-success-700"
              >
                <span className="text-2xl">💡</span>
                <span className="text-sm font-medium">Add LED</span>
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowDevices(!showDevices)}
                className="flex flex-col items-center gap-1 p-4 h-auto col-span-2"
              >
                <span className="text-2xl">📋</span>
                <span className="text-sm text-surface-600">
                  {showDevices ? 'Hide Devices' : 'Manage Devices'}
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {showDevices && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Cameras */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-surface-900">📷 Cameras</h3>
              <Button variant="primary" size="sm" onClick={handleCameraCreate}>
                ➕ Add Camera
              </Button>
            </div>
            <GenericList
              type="camera"
              data={cameras}
              onEdit={handleCameraEdit}
              onDelete={handleCameraDelete}
              emptyIcon="📷"
              emptyTitle="No Cameras"
              emptyMessage="No cameras registered yet."
            />
          </div>

          {/* LEDs */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-surface-900">💡 LED Systems</h3>
              <Button variant="primary" size="sm" onClick={handleLEDCreate}>
                ➕ Add LED
              </Button>
            </div>
            <GenericList
              type="led"
              data={leds}
              onDelete={handleLEDDelete}
              emptyIcon="💡"
              emptyTitle="No LEDs"
              emptyMessage="No LED systems registered yet."
            />
          </div>
        </div>
      )}

      {/* Dialogs */}
      <CameraDialog
        open={cameraForm.open}
        item={cameraForm.item}
        onClose={closeCameraForm}
        onSubmit={handleCameraSubmit}
        loading={cameraSubmitting}
      />
      <ConfirmDialog
        open={cameraDelete.open}
        onClose={closeCameraDelete}
        onConfirm={handleCameraConfirmDelete}
        title="Delete Camera"
        message="Are you sure you want to delete this camera?"
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={cameraSubmitting}
      />

      <LEDDialog
        open={ledForm.open}
        item={ledForm.item}
        onClose={closeLEDForm}
        onSubmit={handleLEDSubmit}
        loading={ledSubmitting}
      />
      <ConfirmDialog
        open={ledDelete.open}
        onClose={closeLEDDelete}
        onConfirm={handleLEDConfirmDelete}
        title="Delete LED"
        message="Are you sure you want to delete this LED system?"
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={ledSubmitting}
      />
    </div>
  );
}
