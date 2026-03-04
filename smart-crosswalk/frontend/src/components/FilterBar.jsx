import { useState } from 'react';
import { Button, Card, Badge, DateRangePicker, Select, SearchInput } from './ui';

/**
 * @typedef {object} DateRange
 * @property {string} [startDate]
 * @property {string} [endDate]
 */

/**
 * @typedef {object} FilterState
 * @property {string} [dangerLevel]
 * @property {string} [crosswalkSearch]
 * @property {DateRange} [dateRange]
 */

/**
 * @typedef {object} CrosswalkRef
 * @property {string} _id
 * @property {{ city?: string, street?: string, number?: string|number }} [location]
 */

// Static config per filter key — drives labels, types, and select options.
const FILTER_CONFIG = {
  dangerLevel:     { label: 'Danger Level',    options: [{ value: 'LOW', label: 'Low' }, { value: 'MEDIUM', label: 'Medium' }, { value: 'HIGH', label: 'High' }] },
  dateRange:       { label: 'Date Range',      type: 'daterange' },
  crosswalkSearch: { label: 'Search Crosswalk', type: 'search' },
};

/**
 * FilterBar — collapsible panel with alert-specific filter controls.
 * Supports danger-level select, crosswalk text search, and a date-range
 * picker.  Renders an "Active" badge whenever any filter is non-default.
 *
 * @param {object} props
 * @param {FilterState} props.filters - Current filter state object
 * @param {(filters: FilterState) => void} props.onFilterChange - Called with the full updated filters object on each change
 * @param {() => void} props.onClear - Called when the "Clear All" button is clicked
 * @param {CrosswalkRef[]} [props.crosswalks=[]] - List of crosswalk documents for the crosswalk-ID filter
 *
 * @example
 * <FilterBar
 *   filters={filters}
 *   onFilterChange={setFilters}
 *   onClear={clearFilters}
 *   crosswalks={crosswalks}
 * />
 */
export function FilterBar({ filters, onFilterChange, onClear, crosswalks = [] }) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleChange = (filterKey, value) => {
    onFilterChange({ ...filters, [filterKey]: value });
  };

  const hasActiveFilters =
    filters.dangerLevel !== 'all' ||
    (filters.crosswalkSearch && filters.crosswalkSearch.trim() !== '') ||
    (filters.dateRange?.startDate || filters.dateRange?.endDate);

  return (
    <Card className="p-4! shadow-xs mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-lg">🔍</span>
          <h3 className="font-semibold text-surface-900">Filters</h3>
          {hasActiveFilters && <Badge variant="primary">Active</Badge>}
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button variant="secondary" size="sm" onClick={onClear}>Clear All</Button>
          )}
          <Button variant="secondary" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? '▲ Hide' : '▼ Show'}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-surface-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(filters).map(([key, value]) => {
              const config = FILTER_CONFIG[key];
              if (!config) return null;

              return (
                <div key={key}>
                  {key === 'dateRange' ? (
                    <DateRangePicker
                      label={config.label}
                      startDate={value?.startDate}
                      endDate={value?.endDate}
                      onChange={(dateRange) => handleChange(key, dateRange)}
                    />
                  ) : key === 'crosswalkSearch' ? (
                    <SearchInput
                      label={config.label}
                      value={value || ''}
                      onChange={(val) => handleChange(key, val)}
                      placeholder="Search by city, street, or number..."
                    />
                  ) : key === 'crosswalkId' && crosswalks.length > 0 ? (
                    <Select
                      label={config.label}
                      value={value || 'all'}
                      onChange={(val) => handleChange(key, val)}
                    >
                      <option value="all">All Crosswalks</option>
                      {crosswalks.map((cw) => (
                        <option key={cw._id} value={cw._id}>
                          {cw.location?.city} - {cw.location?.street} {cw.location?.number}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Select
                      label={config.label}
                      value={value || 'all'}
                      onChange={(val) => handleChange(key, val)}
                    >
                      <option value="all">All {config.label}</option>
                      {config.options.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </Select>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}

