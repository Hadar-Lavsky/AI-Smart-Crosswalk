import { Card, CardContent, Button } from '../ui';

/**
 * @typedef {object} FieldShape
 * @property {string} [label]
 * @property {React.ReactNode} [value]
 * @property {React.ReactNode} [component]
 * @property {string} [valueClassName]
 * @property {boolean} [break]
 */

/**
 * @typedef {object} ActionShape
 * @property {string} label
 * @property {() => void} [onClick]
 * @property {string} [variant]
 * @property {string} [href]
 * @property {string} [target]
 * @property {string} [rel]
 * @property {boolean} [disabled]
 */

/**
 * GenericDetailCard — low-level card renderer.
 * Accepts explicit `header`, `image`, `fields`, and `actions` props.
 *
 * @param {object} props
 * @param {{ icon?: string, title?: string, subtitle?: string }} [props.header]
 * @param {{ url?: string, alt?: string, fallbackIcon?: string }} [props.image]
 * @param {FieldShape[]} [props.fields=[]]
 * @param {ActionShape[]} [props.actions=[]]
 * @param {() => void} [props.onClick]
 * @param {string} [props.className]
 */
export function GenericDetailCard({
  header,
  image,
  fields = [],
  actions = [],
  onClick,
  className = '',
}) {
  return (
    <Card
      className={`hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {header && (
        <div className="px-4 py-3 border-b border-surface-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {header.icon && <span className="text-xl">{header.icon}</span>}
            {header.title && (
              <h3 className="font-semibold text-surface-900">{header.title}</h3>
            )}
          </div>
          {header.subtitle && (
            <span className="text-sm text-surface-500">{header.subtitle}</span>
          )}
        </div>
      )}

      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Image */}
          {image && (
            <div className="flex-shrink-0">
              {image.url ? (
                <img
                  src={image.url}
                  alt={image.alt || 'Detail image'}
                  className="w-32 h-32 rounded-lg object-cover border border-surface-200"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src =
                      'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="128" height="128"%3E%3Crect fill="%23f3f4f6" width="128" height="128"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-size="32"%3E📷%3C/text%3E%3C/svg%3E';
                  }}
                />
              ) : (
                <div className="w-32 h-32 rounded-lg bg-surface-100 border border-surface-200 flex flex-col items-center justify-center">
                  <span className="text-4xl text-surface-400">
                    {image.fallbackIcon || '📷'}
                  </span>
                  <span className="text-xs text-surface-500 mt-1">No Image</span>
                </div>
              )}
            </div>
          )}

          {/* Fields */}
          {fields.length > 0 && (
            <div className="flex-1 space-y-2">
              {fields.map((field, i) => (
                <div key={i} className="flex items-start gap-2">
                  {field.label && (
                    <span className="text-sm font-medium text-surface-600">
                      {field.label}:
                    </span>
                  )}
                  {field.component ? (
                    field.component
                  ) : (
                    <span
                      className={`text-sm ${field.valueClassName || 'text-surface-900'} ${field.break ? 'break-all' : ''}`}
                    >
                      {field.value}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        {actions.length > 0 && (
          <div
            className="mt-4 flex gap-2"
            onClick={(e) => onClick && e.stopPropagation()}
          >
            {actions.map((action, i) =>
              action.href ? (
                <a
                  key={i}
                  href={action.href}
                  target={action.target}
                  rel={action.rel}
                  className={`inline-flex items-center justify-center px-4 py-2 rounded-lg font-medium transition-all duration-200 cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-offset-2 ${
                    action.variant === 'secondary' ? 'bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-500' :
                    action.variant === 'danger'    ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500' :
                    action.variant === 'success'   ? 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500' :
                    'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500'
                  }`}
                >
                  {action.label}
                </a>
              ) : (
                <Button
                  key={i}
                  variant={action.variant || 'primary'}
                  onClick={action.onClick}
                  disabled={action.disabled}
                >
                  {action.label}
                </Button>
              ),
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
