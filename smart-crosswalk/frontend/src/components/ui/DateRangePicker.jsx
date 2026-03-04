import { useState } from 'react';
import { Button } from '../ui';

const PRESETS = [
  { label: 'Today', getValue: () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return { startDate: today.toISOString(), endDate: new Date().toISOString() };
  }},
  { label: 'Last 7 Days', getValue: () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 7);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }},
  { label: 'Last 30 Days', getValue: () => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }},
  { label: 'This Month', getValue: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { startDate: start.toISOString(), endDate: new Date().toISOString() };
  }},
  { label: 'Last Month', getValue: () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth(), 0);
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }},
  { label: 'All Time', getValue: () => ({ startDate: null, endDate: null }) }
];

/**
 * DateRangePicker — date range selector with quick presets and a
 * custom date-input mode.  Calls `onChange({ startDate, endDate })`
 * where each value is an ISO string or `null`.
 *
 * @param {object} props
 * @param {string} [props.label] - Label rendered above the preset buttons
 * @param {string|null} [props.startDate] - ISO string or null for the range start
 * @param {string|null} [props.endDate] - ISO string or null for the range end
 * @param {(range: { startDate: string|null, endDate: string|null }) => void} props.onChange - Called with the date range
 * @param {Date} [props.maxDate] - Latest selectable date (defaults to today)
 *
 * @example
 * <DateRangePicker
 *   label="Date Range"
 *   startDate={filters.startDate}
 *   endDate={filters.endDate}
 *   onChange={(range) => updateFilters(range)}
 * />
 */
export function DateRangePicker({ label, startDate, endDate, onChange, maxDate = new Date() }) {
  const [customMode, setCustomMode] = useState(false);
  const [localStart, setLocalStart] = useState(
    startDate ? new Date(startDate).toISOString().split('T')[0] : ''
  );
  const [localEnd, setLocalEnd] = useState(
    endDate ? new Date(endDate).toISOString().split('T')[0] : ''
  );

  const handlePresetClick = (preset) => {
    const { startDate: start, endDate: end } = preset.getValue();
    onChange({ startDate: start, endDate: end });
    setCustomMode(false);
  };

  const handleCustomApply = () => {
    onChange({
      startDate: localStart ? new Date(localStart).toISOString() : null,
      endDate: localEnd ? new Date(localEnd).toISOString() : null
    });
  };

  const formatDate = (date) => {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
  };

  const maxDateStr = maxDate.toISOString().split('T')[0];

  return (
    <div className="space-y-3">
      {label && (
        <label className="text-sm font-medium text-surface-700">{label}</label>
      )}
      {/* Presets */}
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => {
          const presetValue = preset.getValue();
          const isActive =
            formatDate(presetValue.startDate) === formatDate(startDate) &&
            formatDate(presetValue.endDate) === formatDate(endDate);

          return (
            <button
              key={preset.label}
              onClick={() => handlePresetClick(preset)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                isActive
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
        <button
          onClick={() => setCustomMode(!customMode)}
          className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
            customMode
              ? 'bg-blue-500 text-white border-blue-500'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
        >
          Custom Range
        </button>
      </div>

      {/* Custom Date Inputs */}
      {customMode && (
        <div className="flex items-end gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              type="date"
              value={localStart}
              onChange={(e) => setLocalStart(e.target.value)}
              max={localEnd || maxDateStr}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              type="date"
              value={localEnd}
              onChange={(e) => setLocalEnd(e.target.value)}
              min={localStart}
              max={maxDateStr}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button
            onClick={handleCustomApply}
            disabled={!localStart && !localEnd}
          >
            Apply
          </Button>
        </div>
      )}
    </div>
  );
}
