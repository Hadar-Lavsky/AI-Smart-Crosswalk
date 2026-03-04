import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader, SearchBar, LoadingScreen, Button, Badge, ConfirmDialog } from '../components/ui';
import { useToast } from '../components/ui';
import { StatsGrid } from '../components/common/StatsGrid';
import { GenericList } from '../components/common/GenericList';
import { GenericDetailCard } from '../components/common/GenericDetailCard';
import { CrosswalkDialog, CrosswalkEditDialog } from '../components/crosswalks';
import { useCrosswalks, useCameras, useLEDs } from '../hooks';

/**
 * Crosswalks — CRUD list page for crosswalk locations.
 *
 * Shows a searchable, stat-annotated list of all crosswalks.
 * Clicking a row navigates to CrosswalkDetailsPage.
 * A tabbed edit dialog lets the user update the location or manage linked
 * Camera / LED devices without leaving the list view.
 *
 * Route: `/crosswalks`
 */
export function Crosswalks() {
  const navigate = useNavigate();
  const {
    crosswalks,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    error,
    createCrosswalk,
    updateCrosswalk,
    deleteCrosswalk,
    linkCamera,
    unlinkCamera,
    linkLED,
    unlinkLED,
    refetch,
  } = useCrosswalks();

  const { cameras, createCamera, refetch: refetchCameras } = useCameras();
  const { leds, createLED, refetch: refetchLEDs } = useLEDs();
  const { addToast } = useToast();

  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Create/Edit dialog state
  const [formDialog, setFormDialog] = useState({ open: false, item: null });
  const handleCreate = () => setFormDialog({ open: true, item: null });
  const closeFormDialog = () => setFormDialog({ open: false, item: null });

  const handleFormSubmit = async (formData) => {
    setSubmitting(true);
    try {
      if (formDialog.item) {
        await updateCrosswalk(formDialog.item._id, formData);
        addToast('Crosswalk updated successfully', 'success');
      } else {
        await createCrosswalk(formData);
        addToast('Crosswalk created successfully', 'success');
      }
      closeFormDialog();
    } catch (err) {
      addToast(err.message || 'Error saving crosswalk', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete dialog state
  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });
  const handleDelete = (item) => setDeleteDialog({ open: true, item });
  const closeDeleteDialog = () => setDeleteDialog({ open: false, item: null });

  const handleConfirmDelete = async () => {
    setSubmitting(true);
    try {
      await deleteCrosswalk(deleteDialog.item._id);
      addToast('Crosswalk deleted successfully', 'success');
      closeDeleteDialog();
    } catch (err) {
      addToast(err.message || 'Error deleting crosswalk', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const [editDialog, setEditDialog] = useState({ open: false, crosswalk: null });

  const handleEdit = (crosswalk) => {
    setEditDialog({ open: true, crosswalk });
  };

  const handleCrosswalkClick = useCallback(
    (crosswalk) => {
      navigate(`/crosswalks/${crosswalk._id}`);
    },
    [navigate],
  );

  // Helper: wraps any async action with loading state, toast feedback, and optional refetch.
  const withLoading =
    (action, successMsg, errorMsg, refetchFn = refetch) =>
    async (...args) => {
      setSubmitting(true);
      try {
        await action(...args);
        addToast(successMsg, 'success');
        refetchFn();
      } catch (err) {
        addToast(err.message || errorMsg, 'error');
      } finally {
        setSubmitting(false);
      }
    };

  const handleUpdate = withLoading(
    (id, data) => updateCrosswalk(id, data),
    'Location updated successfully',
    'Error updating location',
  );
  const handleLinkCamera = withLoading(
    (id, cameraId) => linkCamera(id, cameraId),
    'Camera linked successfully',
    'Error linking camera',
  );
  const handleUnlinkCamera = withLoading(
    (id) => unlinkCamera(id),
    'Camera unlinked successfully',
    'Error unlinking camera',
  );
  const handleLinkLED = withLoading(
    (id, ledId) => linkLED(id, ledId),
    'LED linked successfully',
    'Error linking LED',
  );
  const handleUnlinkLED = withLoading(
    (id) => unlinkLED(id),
    'LED unlinked successfully',
    'Error unlinking LED',
  );
  const handleCreateCamera = withLoading(
    () => createCamera({ status: 'active' }),
    'Camera created successfully',
    'Error creating camera',
    refetchCameras,
  );
  const handleCreateLED = withLoading(
    () => createLED({}),
    'LED created successfully',
    'Error creating LED',
    refetchLEDs,
  );

  // Search filter
  const filtered = crosswalks.filter((item) => {
    if (!searchQuery) return true;
    const s = searchQuery.toLowerCase();
    return (
      item.location?.city?.toLowerCase().includes(s) ||
      item.location?.street?.toLowerCase().includes(s) ||
      String(item.location?.number).includes(s)
    );
  });

  // Stats
  const stats = [
    { title: 'Total Crosswalks', value: crosswalks.length, icon: '🚦', color: 'primary' },
    { title: 'Active', value: crosswalks.filter((c) => c.cameraId?.status === 'active').length, icon: '✅', color: 'success' },
    { title: 'With Camera', value: crosswalks.filter((c) => c.cameraId).length, icon: '📷', color: 'warning' },
    { title: 'With LED', value: crosswalks.filter((c) => c.ledId).length, icon: '💡', color: 'orange' },
  ];

  if (loading) return <LoadingScreen message="Loading crosswalks..." />;

  if (error) {
    return (
      <GenericDetailCard
        header={{ icon: '⚠️', title: 'Error' }}
        fields={[{ value: error, valueClassName: 'text-danger-600' }]}
      />
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Crosswalks"
          description="Manage all smart crosswalk locations and their connected devices."
          actions={
            <div className="flex items-center gap-3">
              <Badge variant="default">{crosswalks.length} total</Badge>
              <Button variant="primary" onClick={handleCreate}>
                ➕ Add Crosswalk
              </Button>
            </div>
          }
        />

        {/* Stats */}
        <StatsGrid stats={stats} />

        {/* Search */}
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by city, street, or number..."
          filteredCount={filtered.length}
          totalCount={crosswalks.length}
          entityLabel="crosswalks"
        />

        {/* List */}
        <GenericList
          type="crosswalk"
          data={filtered}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onClick={handleCrosswalkClick}
          hasMore={hasMore}
          onLoadMore={loadMore}
          loadingMore={loadingMore}
          emptyIcon={searchQuery ? '🔍' : '🚦'}
          emptyTitle={searchQuery ? 'No Matching Crosswalks' : 'No Crosswalks'}
          emptyMessage={searchQuery ? 'Try a different search term.' : 'Get started by adding your first crosswalk location.'}
          emptyActionLabel={searchQuery ? 'Clear Search' : undefined}
          onEmptyAction={searchQuery ? () => setSearchQuery('') : undefined}
        />
      </div>

      {/* Dialogs */}
      <CrosswalkDialog
        open={formDialog.open}
        item={formDialog.item}
        onClose={closeFormDialog}
        onSubmit={handleFormSubmit}
        loading={submitting}
        cameras={cameras}
        leds={leds}
      />

      <CrosswalkEditDialog
        open={editDialog.open}
        item={editDialog.crosswalk}
        onClose={() => setEditDialog({ open: false, crosswalk: null })}
        loading={submitting}
        cameras={cameras}
        leds={leds}
        onUpdate={handleUpdate}
        onLinkCamera={handleLinkCamera}
        onUnlinkCamera={handleUnlinkCamera}
        onLinkLED={handleLinkLED}
        onUnlinkLED={handleUnlinkLED}
        onCreateCamera={handleCreateCamera}
        onCreateLED={handleCreateLED}
      />

      <ConfirmDialog
        open={deleteDialog.open}
        onClose={closeDeleteDialog}
        onConfirm={handleConfirmDelete}
        title="Delete Crosswalk"
        message={`Are you sure you want to delete the crosswalk at ${deleteDialog.item?.location?.city}, ${deleteDialog.item?.location?.street}?`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={submitting}
      />
    </>
  );
}
