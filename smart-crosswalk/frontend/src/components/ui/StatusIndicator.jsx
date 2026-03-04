const STATUS_STYLES = {
  online:    { text: 'text-success-600', dot: 'bg-success-500'  },
  connected: { text: 'text-success-600', dot: 'bg-success-500'  },
  offline:   { text: 'text-danger-600',  dot: 'bg-danger-500'   },
  warning:   { text: 'text-warning-600', dot: 'bg-warning-500'  },
};

/**
 * StatusIndicator — pulsing coloured dot + label for system status rows.
 *
 * @param {object} props
 * @param {'online'|'connected'|'offline'|'warning'} [props.status='online'] - Connection / system state — drives the dot colour
 * @param {string} [props.label] - Override the default capitalised status label
 */
export function StatusIndicator({ status = 'online', label }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.online;
  const defaultLabel = status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <span className={`flex items-center gap-2 ${style.text}`}>
      <span className={`h-2 w-2 ${style.dot} rounded-full animate-pulse`} />
      {label || defaultLabel}
    </span>
  );
}
