import { cn } from '../../utils';

/**
 * Card — base surface container with rounded corners and a drop shadow.
 * Compose with CardHeader / CardTitle / CardDescription / CardContent.
 *
 * @param {React.ComponentProps<'div'>} props
 *
 * @example
 * <Card><CardContent>Hello</CardContent></Card>
 */
export function Card({ children, className, ...props }) {
  return (
    <div className={cn('bg-white rounded-xl shadow-md p-6', className)} {...props}>
      {children}
    </div>
  );
}

/**
 * @param {object} props
 * @param {React.ReactNode} [props.children]
 * @param {string} [props.className]
 */
export function CardHeader({ children, className }) {
  return (
    <div className={cn('mb-4', className)}>
      {children}
    </div>
  );
}

/**
 * @param {object} props
 * @param {React.ReactNode} [props.children]
 * @param {string} [props.className]
 */
export function CardTitle({ children, className }) {
  return (
    <h3 className={cn('text-lg font-semibold text-surface-900', className)}>
      {children}
    </h3>
  );
}

/**
 * @param {object} props
 * @param {React.ReactNode} [props.children]
 * @param {string} [props.className]
 */
export function CardDescription({ children, className }) {
  return (
    <p className={cn('text-sm text-surface-500 mt-1', className)}>
      {children}
    </p>
  );
}

/**
 * @param {object} props
 * @param {React.ReactNode} [props.children]
 * @param {string} [props.className]
 */
export function CardContent({ children, className }) {
  return (
    <div className={cn(className)}>
      {children}
    </div>
  );
}
