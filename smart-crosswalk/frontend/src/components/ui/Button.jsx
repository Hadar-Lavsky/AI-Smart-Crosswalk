import { cn } from '../../utils';

const base = 'inline-flex items-center justify-center rounded-lg font-medium transition-all duration-200 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-offset-2';

const variants = {
  primary:   `${base} bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500`,
  secondary: `${base} bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500`,
  danger:    `${base} bg-red-600 text-white hover:bg-red-700 focus:ring-red-500`,
  success:   `${base} bg-green-600 text-white hover:bg-green-700 focus:ring-green-500`,
  ghost:     `${base} bg-transparent hover:bg-surface-100 text-surface-700`,
};

const sizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2',
  lg: 'px-6 py-3 text-lg'
};

/**
 * Button — universal action trigger.
 * Supports multiple visual variants, size tokens, and a built-in loading
 * spinner that disables the element while an async action is running.
 *
 * @param {React.ComponentProps<'button'> & {
 *   variant?: 'primary'|'secondary'|'danger'|'success'|'ghost',
 *   size?: 'sm'|'md'|'lg',
 *   loading?: boolean,
 *   fullWidth?: boolean
 * }} props
 *
 * @example
 * <Button variant="primary" loading={saving} onClick={save}>Save</Button>
 */
export function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  loading,
  fullWidth = false,
  ...props
}) {
  return (
    <button
      className={cn(
        variants[variant],
        sizes[size],
        disabled && 'opacity-50 cursor-not-allowed',
        loading && 'cursor-wait',
        fullWidth && 'w-full',
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          Loading...
        </span>
      ) : (
        children
      )}
    </button>
  );
}
