// ═══════════════════════════════════════════════════════════════════
// Controller Helpers — Shared utilities for all controllers
// ═══════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────
// Mongoose Population Config
// ─────────────────────────────────────────────────────────────────

/**
 * Shared Mongoose populate config for Alert → Crosswalk → Camera/LED nested lookup.
 * Used in alertControllers and crosswalkControllers (getCrosswalkAlerts).
 */
export const alertCrosswalkPopulate = {
  path: "crosswalkId",
  select: "location cameraId ledId",
  populate: [
    { path: "cameraId", select: "_id status" },
    { path: "ledId", select: "_id" },
  ],
};

// ─────────────────────────────────────────────────────────────────
// Pagination Helpers
// ─────────────────────────────────────────────────────────────────

/**
 * Parse `page` and `limit` from query params.
 * @param {Object} query - Request query parameters
 * @param {number} defaultLimit - Default limit if not specified
 * @returns {{ parsedPage: number, parsedLimit: number, skip: number }}
 */
export function parsePagination(query, defaultLimit = 10) {
  const parsedPage = parseInt(query.page) || 1;
  const parsedLimit = parseInt(query.limit) || defaultLimit;
  const skip = (parsedPage - 1) * parsedLimit;
  return { parsedPage, parsedLimit, skip };
}

/**
 * Build the standard pagination response object.
 * @param {number} parsedPage - Current page number
 * @param {number} parsedLimit - Items per page
 * @param {number} total - Total number of items
 * @returns {{ currentPage: number, totalPages: number, total: number, hasMore: boolean }}
 */
export function buildPagination(parsedPage, parsedLimit, total) {
  return {
    currentPage: parsedPage,
    totalPages: Math.ceil(total / parsedLimit),
    total,
    hasMore: parsedPage * parsedLimit < total,
  };
}

// ─────────────────────────────────────────────────────────────────
// Error Handling
// ─────────────────────────────────────────────────────────────────

/**
 * Set status 404 and throw a not-found error.
 * Must be called inside a try/catch that passes to next(error).
 * @param {Object} res - Express response object
 * @param {string} message - Error message
 */
export function notFound(res, message) {
  res.status(404);
  throw new Error(message);
}
