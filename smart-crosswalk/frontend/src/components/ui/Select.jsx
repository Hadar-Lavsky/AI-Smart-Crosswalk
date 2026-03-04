import { cn } from '../../utils';

/**
 * @typedef {{ value: string, label: string }} SelectOption
 */

/**
 * Select — controlled dropdown with optional label and validation error.
 * Accepts either an `options` array `[{ value, label }]` or `children`
 * (raw `<option>` elements) for more complex option lists.
 * Calls `onChange(value: string)` — not a native event.
 *
 * @param {Omit<React.ComponentProps<'select'>, 'onChange'> & {
 *   label?: string,
 *   options?: SelectOption[],
 *   placeholder?: string,
 *   error?: string,
 *   onChange: (value: string) => void
 * }} props
 *
 * @example
 * <Select label="Status" value={status} onChange={setStatus}
 *   options={[{ value: 'active', label: 'Active' }]} />
 */
export function Select({
  label,
  value,
  onChange,
  options = [],
  placeholder = 'Select option...',
  error,
  required,
  disabled,
  className,
  children,
  ...props
}) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label className="text-sm font-medium text-surface-700">
          {label}
          {required && <span className="text-danger-600 mr-1">*</span>}
        </label>
      )}
      
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          'w-full px-3 py-2 border rounded-lg transition-colors',
          'focus:outline-hidden focus:ring-2 focus:ring-primary-500 focus:border-primary-500',
          error 
            ? 'border-danger-500 focus:ring-danger-500 focus:border-danger-500' 
            : 'border-surface-300',
          disabled && 'bg-surface-100 cursor-not-allowed opacity-60',
          'bg-white text-surface-900'
        )}
        {...props}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        
        {children || options.map((option) => (
          <option 
            key={option.value} 
            value={option.value}
          >
            {option.label}
          </option>
        ))}
      </select>
      
      {error && (
        <p className="text-sm text-danger-600">{error}</p>
      )}
    </div>
  );
}
