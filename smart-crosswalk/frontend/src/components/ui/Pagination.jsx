import { Button } from './Button';

/**
 * Pagination — numbered page navigation with automatic ellipsis.
 * Returns `null` when `totalPages <= 1` — no need to guard at the call-site.
 *
 * @param {object} props
 * @param {number} props.currentPage - Currently active page (1-based)
 * @param {number} props.totalPages - Total number of pages
 * @param {boolean} props.hasMore - Whether a next page exists
 * @param {(page: number) => void} props.onPageChange - Called with the new page number when the user navigates
 *
 * @example
 * <Pagination
 *   currentPage={page} totalPages={10}
 *   hasMore={hasMore} onPageChange={goToPage}
 * />
 */
export function Pagination({ currentPage, totalPages, hasMore, onPageChange }) {
  if (totalPages <= 1) return null;

  // Always show first, last, and pages within 1 of current
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1);

  return (
    <div className="flex items-center justify-center gap-2">
      <Button
        variant="secondary"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Previous
      </Button>

      <div className="flex items-center gap-1">
        {pages.map((page, i, arr) => (
          <span key={page} className="contents">
            {i > 0 && arr[i - 1] !== page - 1 && (
              <span className="text-gray-400 px-1">...</span>
            )}
            <Button
              variant={page === currentPage ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => onPageChange(page)}
            >
              {page}
            </Button>
          </span>
        ))}
      </div>

      <Button
        variant="secondary"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={!hasMore}
      >
        Next
      </Button>
    </div>
  );
}
