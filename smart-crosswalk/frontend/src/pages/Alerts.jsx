import { useState } from "react";
import {
  PageHeader,
  LoadingScreen,
  Button,
  ConfirmDialog,
} from "../components/ui";
import { useToast } from "../components/ui";
import { StatsGrid } from "../components/common/StatsGrid";
import { GenericList } from "../components/common/GenericList";
import { GenericDetailCard } from "../components/common/GenericDetailCard";
import { AlertDialog } from "../components/alerts";
import { FilterBar } from "../components/FilterBar";
import { useAlerts, useCrosswalks } from "../hooks";

/**
 * Alerts — CRUD list page for detection alerts.
 *
 * Shows a stat-annotated list of all alerts from all crosswalks.
 * Includes a collapsible FilterBar for danger-level, crosswalk-search, and
 * date-range filtering.
 *
 * Route: `/alerts`
 */
export function Alerts() {
  const {
    alerts,
    stats,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    error,
    updateAlert,
    deleteAlert,
    createAlert,
  } = useAlerts();
  const { crosswalks } = useCrosswalks();

  const { addToast } = useToast();

  const [filters, setFilters] = useState({
    dangerLevel: "all",
    crosswalkSearch: "",
    dateRange: { startDate: null, endDate: null },
  });

  // Create/Edit dialog state
  const [formDialog, setFormDialog] = useState({ open: false, item: null });
  const [submitting, setSubmitting] = useState(false);
  const handleCreate = () => setFormDialog({ open: true, item: null });
  const handleEdit = (item) => setFormDialog({ open: true, item });
  const closeFormDialog = () => setFormDialog({ open: false, item: null });

  const handleFormSubmit = async (formData) => {
    setSubmitting(true);
    try {
      if (formDialog.item) {
        await updateAlert(formDialog.item._id, formData);
        addToast("Alert updated successfully", "success");
      } else {
        await createAlert(formData);
        addToast("Alert created successfully", "success");
      }
      closeFormDialog();
    } catch (err) {
      addToast(err.message || "Error saving alert", "error");
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
      await deleteAlert(deleteDialog.item._id);
      addToast("Alert deleted successfully", "success");
      closeDeleteDialog();
    } catch (err) {
      addToast(err.message || "Error deleting alert", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const filterAlert = (alert) => {
    if (
      filters.dangerLevel !== "all" &&
      alert.dangerLevel !== filters.dangerLevel
    )
      return false;
    if (filters.crosswalkSearch) {
      const s = filters.crosswalkSearch.toLowerCase();
      const loc = alert.crosswalkId?.location;
      if (
        !["city", "street", "number"].some((k) =>
          loc?.[k]?.toLowerCase().includes(s),
        )
      )
        return false;
    }
    if (filters.dateRange.startDate || filters.dateRange.endDate) {
      const d = new Date(alert.timestamp);
      if (
        filters.dateRange.startDate &&
        d < new Date(filters.dateRange.startDate)
      )
        return false;
      if (filters.dateRange.endDate) {
        const end = new Date(filters.dateRange.endDate);
        end.setHours(23, 59, 59, 999);
        if (d > end) return false;
      }
    }
    return true;
  };

  const filteredAlerts = alerts.filter(filterAlert);

  // Stats
  const alertStats = [
    {
      title: "Total Alerts",
      value: stats.total ?? 0,
      icon: "📋",
      color: "primary",
    },
    {
      title: "High Danger",
      value: stats.high ?? 0,
      icon: "🚨",
      color: "danger",
    },
    {
      title: "Medium Danger",
      value: stats.medium ?? 0,
      icon: "🚨",
      color: "warning",
    },
    {
      title: "Low Danger",
      value: stats.low ?? 0,
      icon: "🚨",
      color: "success",
    },
  ];

  if (loading) return <LoadingScreen message="Loading alerts..." />;

  if (error) {
    return (
      <GenericDetailCard
        header={{ icon: "⚠️", title: "Error" }}
        fields={[{ value: error, valueClassName: "text-danger-600" }]}
      />
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Alerts"
          description="Monitor and manage all detection alerts from crosswalk cameras."
          actions={
            <Button variant="primary" onClick={handleCreate}>
              ➕ Add Alert
            </Button>
          }
        />

        {/* Stats */}
        <StatsGrid stats={alertStats} cols={alertStats.length} />

        {/* Filters */}
        <FilterBar
          filters={filters}
          onFilterChange={setFilters}
          onClear={() =>
            setFilters({
              dangerLevel: "all",
              crosswalkSearch: "",
              dateRange: { startDate: null, endDate: null },
            })
          }
          crosswalks={crosswalks}
        />

        {/* List */}
        <GenericList
          type="alert"
          data={filteredAlerts}
          onEdit={handleEdit}
          onDelete={handleDelete}
          hasMore={hasMore}
          onLoadMore={loadMore}
          loadingMore={loadingMore}
          emptyIcon={alerts.length === 0 ? '🚨' : '🔍'}
          emptyTitle={alerts.length === 0 ? 'No Alerts' : 'No Matching Alerts'}
          emptyMessage={alerts.length === 0
            ? 'No detection alerts have been recorded yet.'
            : 'Try adjusting your filters to see more results.'}
        />
      </div>

      {/* Dialogs */}
      <AlertDialog
        open={formDialog.open}
        item={formDialog.item}
        onClose={closeFormDialog}
        onSubmit={handleFormSubmit}
        loading={submitting}
        crosswalks={crosswalks}
      />

      <ConfirmDialog
        open={deleteDialog.open}
        onClose={closeDeleteDialog}
        onConfirm={handleConfirmDelete}
        title="Delete Alert"
        message="Are you sure you want to delete this alert?"
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={submitting}
      />
    </>
  );
}
