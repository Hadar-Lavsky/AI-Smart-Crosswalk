import { cn } from "../../utils";

// ─── StatsCard ────────────────────────────────────────────────────────────────

const COLOR = {
  primary: {
    value: "text-primary-600",
    icon: "bg-primary-50  text-primary-600",
  },
  success: {
    value: "text-success-600",
    icon: "bg-success-50  text-success-600",
  },
  warning: { value: "text-yellow-500", icon: "bg-yellow-50   text-yellow-500" },
  orange: { value: "text-orange-500", icon: "bg-orange-50   text-orange-500" },
  danger: { value: "text-danger-600", icon: "bg-danger-50   text-danger-600" },
};

/**
 * @typedef {object} StatShape
 * @property {string} title
 * @property {number|string} value
 * @property {string} [icon]
 * @property {string} [color='primary']
 * @property {string} [description]
 */

/**
 * StatsCard — single metric cell inside a StatsGrid.
 *
 * @param {object} props
 * @param {string} props.title
 * @param {number|string} props.value
 * @param {string} [props.icon]
 * @param {string} [props.color='primary']
 * @param {string} [props.description]
 */
export function StatsCard({
  title,
  value,
  icon,
  color = "primary",
  description,
}) {
  const v = COLOR[color] ?? COLOR.primary;
  return (
    <div className="flex flex-col items-center text-center gap-3 py-6 px-4">
      {icon && (
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center text-2xl",
            v.icon,
          )}
        >
          {icon}
        </div>
      )}
      <div>
        <p className={cn("text-3xl font-bold leading-none", v.value)}>
          {value}
        </p>
        <p className="text-sm font-medium text-surface-500 mt-1">{title}</p>
        {description && (
          <p className="text-xs text-surface-400 mt-1">{description}</p>
        )}
      </div>
    </div>
  );
}

// ─── StatsGrid ────────────────────────────────────────────────────────────────

/**
 * StatsGrid — responsive grid of StatsCard tiles inside a card shell.
 *
 * @param {object} props
 * @param {StatShape[]} [props.stats=[]]
 * @param {number} [props.cols]
 */
export function StatsGrid({ stats = [], cols }) {
  if (!stats.length) return null;
  const colCount = cols ?? stats.length;
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-2",
    3: "grid-cols-3",
    4: "grid-cols-4",
    5: "grid-cols-5",
    6: "grid-cols-6",
  };
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden p-0">
      <div className={cn("grid", gridCols[colCount] ?? "grid-cols-4")}>
        {stats.map((s, i) => (
          <div
            key={i}
            className={cn(
              "border-surface-100",
              i !== 0 && "border-l",
              i >= colCount && "border-t",
            )}
          >
            <StatsCard {...s} />
          </div>
        ))}
      </div>
    </div>
  );
}
