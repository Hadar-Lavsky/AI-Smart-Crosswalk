import { cn } from '../../utils';

const base = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

const variants = {
  default: `${base} bg-surface-100 text-surface-800`,
  primary: `${base} bg-blue-100 text-blue-800`,
  success: `${base} bg-green-100 text-green-800`,
  warning: `${base} bg-yellow-100 text-yellow-800`,
  orange:  `${base} bg-orange-100 text-orange-900`,
  danger:  `${base} bg-red-100 text-red-900`,
};

/**
 * Badge — small inline label used to communicate status or category.
 *
 * @param {React.ComponentProps<'span'> & {
 *   variant?: 'default'|'primary'|'success'|'warning'|'orange'|'danger'
 * }} props
 *
 * @example
 * <Badge variant="success">Active</Badge>
 * <Badge variant="danger">High</Badge>
 */
export function Badge({ children, variant = 'default', className, ...props }) {
  return (
    <span className={cn(variants[variant], className)} {...props}>
      {children}
    </span>
  );
}
