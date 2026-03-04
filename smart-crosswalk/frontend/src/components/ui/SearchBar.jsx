import { cn } from '../../utils';
import { Card, CardTitle, CardDescription } from './Card';
import { SearchInput } from './SearchInput';

/**
 * SearchBar — controlled search input in a card shell.
 * Shows a magnifier icon, a clear (×) button when the query is non-empty,
 * and an optional "Found X of Y entityLabel" counter beneath the field.
 *
 * @param {object} props
 * @param {string} props.value - Controlled search query string
 * @param {(value: string) => void} props.onChange - Called with the new string on every keystroke, or empty string on clear
 * @param {string} [props.placeholder='Search...']
 * @param {number} [props.filteredCount] - Number of items matching the current query (for the counter line)
 * @param {number} [props.totalCount] - Total items before searching; omit to hide the counter
 * @param {string} [props.entityLabel='items'] - Entity noun shown in "Found X of Y entityLabel"
 * @param {string} [props.className]
 *
 * @example
 * const [query, setQuery] = useState('');
 * <SearchBar
 *   value={query} onChange={setQuery}
 *   placeholder="Search by city..."
 *   filteredCount={5} totalCount={20} entityLabel="crosswalks"
 * />
 */
export function SearchBar({
  value,
  onChange,
  placeholder = 'Search...',
  filteredCount,
  totalCount,
  entityLabel = 'items',
  className,
}) {
  return (
    <Card className={cn('p-4! shadow-xs', className)}>
      <div className="flex items-center gap-3 mb-3">
        <CardTitle>🔍 Search & Filter</CardTitle>
      </div>

      <SearchInput value={value} onChange={onChange} placeholder={placeholder} />

      {/* Result counter */}
      {value && totalCount != null && (
        <CardDescription className="mt-2">
          Found {filteredCount} of {totalCount} {entityLabel}
        </CardDescription>
      )}
    </Card>
  );
}
