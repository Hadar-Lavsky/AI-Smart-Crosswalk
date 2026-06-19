import { useState } from "react";
import {
  PageHeader,
  LoadingScreen,
  ConfirmDialog,
} from "../components/ui";
import { useToast } from "../components/ui";
import { StatsGrid } from "../components/common/StatsGrid";
import { GenericList } from "../components/common/GenericList";
import { GenericDetailCard } from "../components/common/GenericDetailCard";
import { AlertDialog, FilterBar, useAlerts } from "../features/alerts";
import { useCrosswalks } from "../features/crosswalks";
import { useDialog } from "../hooks";

const DEFAULT_FILTERS = {
  dangerLevel: "all",
  crosswalkSearch: "",
  dateRange: { startDate: null, endDate: null },
};

/**
 * Alerts — CRUD list page for detection alerts.
 *
 * Shows a stat-annotated list of all alerts from all crosswalks. The
 * collapsible FilterBar (danger level, crosswalk search, date range) is applied
 * SERVER-SIDE, so filtering and pagination stay consistent across the entire
 * dataset rather than only the rows already loaded in the browser.
 *
 * Route: `/alerts`
 */
export function Alerts() {
  // ─────────────────────────────────────────────────────────────
  // Filter State (applied server-side via useAlerts)
  // ─────────────────────────────────────────────────────────────

  const [filters, setFilters] = useState(DEFAULT_FILTERS);

  const filtersActive =
    filters.dangerLevel !== "all" ||
    (filters.crosswalkSearch && filters.crosswalkSearch.trim() !== "") ||
    Boolean(filters.dateRange.startDate || filters.dateRange.endDate);

  // ─────────────────────────────────────────────────────────────
  // Data Fetching
  // ─────────────────────────────────────────────────────────────

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
  } = useAlerts({ filters });
  const { crosswalks } = useCrosswalks();

  const { addToast } = useToast();

  // ─────────────────────────────────────────────────────────────
  // Dialog State
  // ─────────────────────────────────────────────────────────────

  const formDialog = useDialog();
  const deleteDialog = useDialog();

  // ─────────────────────────────────────────────────────────────
  // Event Handlers
  // ─────────────────────────────────────────────────────────────

  const handleFormSubmit = async (formData) => {
    formDialog.setSubmitting(true);
    try {
      if (formDialog.item) {
        await updateAlert(formDialog.item._id, formData);
        addToast("Alert updated successfully", "success");
      } else {
        await createAlert(formData);
        addToast("Alert created successfully", "success");
      }
      formDialog.close();
    } catch (err) {
      addToast(err.message || "Error saving alert", "error");
      formDialog.setSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    deleteDialog.setSubmitting(true);
    try {
      await deleteAlert(deleteDialog.item._id);
      addToast("Alert deleted successfully", "success");
      deleteDialog.close();
    } catch (err) {
      addToast(err.message || "Error deleting alert", "error");
      deleteDialog.setSubmitting(false);
    }
  };

  // ────────────────────────────────────────────────────────────
  // Stats Configuration
  // ────────────────────────────────────────────────────────────

  const alertStats = [
    { title: "Total Alerts", value: stats.total ?? 0, icon: "📋", color: "primary" },
    { title: "High Danger", value: stats.high ?? 0, icon: "🚨", color: "danger" },
    { title: "Medium Danger", value: stats.medium ?? 0, icon: "🚨", color: "warning" },
    { title: "Low Danger", value: stats.low ?? 0, icon: "🚨", color: "success" },
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
        />

        {/* Stats */}
        <StatsGrid stats={alertStats} cols={alertStats.length} />

        {/* Filters */}
        <FilterBar
          filters={filters}
          onFilterChange={setFilters}
          onClear={() => setFilters(DEFAULT_FILTERS)}
          crosswalks={crosswalks}
        />

        {/* List */}
        <GenericList
          type="alert"
          data={alerts}
          onEdit={formDialog.openWith}
          onDelete={deleteDialog.openWith}
          hasMore={hasMore}
          onLoadMore={loadMore}
          loadingMore={loadingMore}
          emptyIcon={filtersActive ? "🔍" : "🚨"}
          emptyTitle={filtersActive ? "No Matching Alerts" : "No Alerts"}
          emptyMessage={
            filtersActive
              ? "Try adjusting your filters to see more results."
              : "No detection alerts have been recorded yet."
          }
        />
      </div>

      {/* Dialogs */}
      <AlertDialog
        open={formDialog.open}
        item={formDialog.item}
        onClose={formDialog.close}
        onSubmit={handleFormSubmit}
        loading={formDialog.submitting}
        crosswalks={crosswalks}
      />

      <ConfirmDialog
        open={deleteDialog.open}
        onClose={deleteDialog.close}
        onConfirm={handleConfirmDelete}
        title="Delete Alert"
        message="Are you sure you want to delete this alert?"
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        loading={deleteDialog.submitting}
      />
    </>
  );
}
