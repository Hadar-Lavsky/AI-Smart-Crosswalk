import { useParams, useNavigate } from 'react-router-dom';
import { useCrosswalkDetails } from '../hooks';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  LoadingScreen,
  DateRangePicker,
  Select,
  PageHeader,
  Badge,
} from '../components/ui';
import { StatsGrid } from '../components/common/StatsGrid';
import { GenericList } from '../components/common/GenericList';
import { GenericDetailCard } from '../components/common/GenericDetailCard';
import { CrosswalkDetailCard } from '../components/crosswalks';

/**
 * CrosswalkDetailsPage — detail view for a single crosswalk.
 *
 * Shows crosswalk metadata and a paginated, filterable events history list.
 *
 * Route: `/crosswalks/:id`
 */
export function CrosswalkDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    crosswalk,
    alerts,
    stats,
    filters,
    updateFilters,
    clearFilters,
    totalAlerts,
    hasMore,
    loadMore,
    loadingMore,
    loading,
    isInitialLoading,
    error,
  } = useCrosswalkDetails(id);

  if (isInitialLoading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <GenericDetailCard
          className="max-w-md w-full"
          header={{ icon: '😞', title: 'Error Loading Crosswalk' }}
          fields={[{ value: error }]}
          actions={[{ label: 'Back to Crosswalks', onClick: () => navigate('/crosswalks') }]}
        />
      </div>
    );
  }

  if (!crosswalk) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <GenericDetailCard
          className="max-w-md w-full"
          header={{ icon: '🚦', title: 'Crosswalk Not Found' }}
          fields={[{ value: 'The requested crosswalk could not be found.' }]}
          actions={[{ label: 'Back to Crosswalks', onClick: () => navigate('/crosswalks') }]}
        />
      </div>
    );
  }

  const hasActiveFilters =
    filters.dateRange.startDate ||
    filters.dateRange.endDate ||
    filters.dangerLevel !== 'all';

  const eventStats = stats?.byDangerLevel
    ? [
        { title: 'Total Events', value: stats.total || 0, icon: '📋', color: 'primary' },
        { title: 'High Danger', value: stats.byDangerLevel.HIGH || 0, icon: '🚨', color: 'danger' },
        { title: 'Medium Danger', value: stats.byDangerLevel.MEDIUM || 0, icon: '🚨', color: 'orange' },
        { title: 'Low Danger', value: stats.byDangerLevel.LOW || 0, icon: '🚨', color: 'warning' },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => navigate('/crosswalks')}
        className="self-start flex items-center gap-1"
      >
        ← Back to Crosswalks
      </Button>

      {/* Header - Crosswalk Details */}
      <CrosswalkDetailCard item={crosswalk} />

      {/* Events History Header */}
      <PageHeader
        title="Events History"
        actions={
          totalAlerts > 0 ? (
            <Badge variant="default">{totalAlerts} total</Badge>
          ) : null
        }
      />

      {/* Stats */}
      {eventStats.length > 0 && <StatsGrid stats={eventStats} cols={4} />}

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filter Events</CardTitle>
            {hasActiveFilters && (
              <Button variant="secondary" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <DateRangePicker
            label="Date Range"
            startDate={filters.dateRange.startDate}
            endDate={filters.dateRange.endDate}
            onChange={(dateRange) => updateFilters({ dateRange })}
          />
          <Select
            label="Danger Level"
            value={filters.dangerLevel}
            onChange={(value) => updateFilters({ dangerLevel: value })}
          >
            <option value="all">All Levels</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </Select>
        </CardContent>
      </Card>

      {/* Alert History List */}
      <GenericList
        type="alert-history"
        data={alerts}
        hasMore={hasMore}
        onLoadMore={loadMore}
        loadingMore={loadingMore}
        emptyIcon="📭"
        emptyTitle="No Events Found"
        emptyMessage={hasActiveFilters
          ? 'Try adjusting your filters to see more results.'
          : 'No alerts have been recorded for this crosswalk yet.'}
      />
    </div>
  );
}
