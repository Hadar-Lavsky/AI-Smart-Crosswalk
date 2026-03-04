/**
 * PageHeader — top-of-page title block with optional description and
 * action slot (right-aligned on wider screens).
 *
 * @param {object} props
 * @param {string} props.title - Main heading
 * @param {string} [props.description] - Subtitle shown beneath the heading
 * @param {React.ReactNode} [props.actions] - Right-side action slot — usually a Button or group of buttons
 *
 * @example
 * <PageHeader
 *   title="Crosswalks"
 *   description="Manage crosswalk locations"
 *   actions={<Button onClick={onCreate}>Add</Button>}
 * />
 */
export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-surface-900">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-surface-500">{description}</p>
          )}
        </div>
        {actions && <div className="flex gap-3">{actions}</div>}
      </div>
    </div>
  );
}
