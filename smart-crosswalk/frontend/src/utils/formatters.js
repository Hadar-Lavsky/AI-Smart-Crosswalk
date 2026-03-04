/**
 * formatters.js — centralised pure-function formatting layer.
 *
 * All functions are stateless and side-effect-free.  Import them wherever
 * you need consistent data display without coupling to React.
 *
 * @module formatters
 */

/**
 * Formats a date value into a human-readable localised string.
 * @param {string|Date|null} date
 * @param {Intl.DateTimeFormatOptions} [options] - Overrides for toLocaleDateString
 * @returns {string}
 */
export function formatDate(date, options = {}) {
  if (!date) return 'N/A';
  try {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
      ...options
    });
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Returns the last `length` characters of a MongoDB ObjectId for compact display.
 * @param {string|null} id
 * @param {number} [length=8]
 * @returns {string}
 */
export const formatId = (id, length = 8) => id ? id.slice(-length) : 'N/A';

/**
 * Maps a camera/LED status string to a display label and a Badge variant.
 * @param {string|null} status
 * @returns {{ text: string, variant: string }}
 */
export function formatStatus(status) {
  const map = {
    active:      { text: 'Active',      variant: 'success' },
    inactive:    { text: 'Inactive',    variant: 'default' },
    error:       { text: 'Error',       variant: 'danger'  },
    maintenance: { text: 'Maintenance', variant: 'warning' },
  };
  if (!status) return { text: 'N/A', variant: 'default' };
  return map[status.toLowerCase()] ?? { text: status, variant: 'default' };
}

/**
 * Returns the image URL as-is (Cloudinary URLs are already absolute).
 * Returns null for falsy inputs.
 * @param {string|null} url
 * @returns {string|null}
 */
export function getImageUrl(url) {
  return url || null;
}

/**
 * Combines a location object into a single display string.
 * @param {{ city?: string, street?: string, number?: string|number }|null} location
 * @returns {string}
 */
export function formatLocation(location) {
  if (!location) return 'Unknown Location';
  const { city, street, number } = location;
  const parts = [city, street, number].filter(Boolean);
  return parts.length ? parts.join(', ') : 'Unknown Location';
}

/**
 * Returns display metadata for a danger level: a Badge variant, a left-border
 * Tailwind class, a human label, and an icon character.
 * @param {'LOW'|'MEDIUM'|'HIGH'} level
 * @returns {{ variant: string, border: string, label: string, icon: string }}
 */
export function formatDangerLevel(level) {
  const configs = {
    LOW:    { variant: 'warning', border: 'border-l-yellow-400', label: 'Low',    icon: '🚨' },
    MEDIUM: { variant: 'orange',  border: 'border-l-orange-500', label: 'Medium', icon: '🚨' },
    HIGH:   { variant: 'danger',  border: 'border-l-red-500',    label: 'High',   icon: '🚨' },
  };
  return configs[level] ?? configs.MEDIUM;
}
