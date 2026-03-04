import { cn } from '../../utils';
import { Input } from './Input';
import { Button } from './Button';

/**
 * SearchInput — bare controlled search field with a magnifier icon and an
 * inline clear (×) button.  No card shell; embed it anywhere.
 *
 * Used internally by `SearchBar` (which wraps it in a card) and directly by
 * `FilterBar` (which already lives inside a card).
 *
 * @param {object} props
 * @param {string} props.value - Controlled search query string
 * @param {(value: string) => void} props.onChange - Called with the new string on every keystroke, or '' on clear
 * @param {string} [props.placeholder='Search...']
 * @param {string} [props.label] - Optional label rendered above the input (aligns with Select / DateRangePicker)
 * @param {string} [props.className]
 *
 * @example
 * <SearchInput
 *   value={query} onChange={setQuery}
 *   placeholder="Search by city..."
 *   label="Search Crosswalk"
 * />
 */
export function SearchInput({ value, onChange, placeholder = 'Search...', label, className }) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label className="text-sm font-medium text-surface-700">{label}</label>
      )}
      <div className="relative">
        <Input
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="[&_input]:pl-10"
        />

        {/* Magnifier icon */}
        <svg
          className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        {/* Clear button */}
        {value && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange('')}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1! text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </Button>
        )}
      </div>
    </div>
  );
}
