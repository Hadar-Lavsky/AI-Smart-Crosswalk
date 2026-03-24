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

/**
 * Parse `page` and `limit` from query params.
 * Returns parsedPage, parsedLimit, and skip offset.
 */
export function parsePagination(query, defaultLimit = 10) {
  const parsedPage = parseInt(query.page) || 1;
  const parsedLimit = parseInt(query.limit) || defaultLimit;
  const skip = (parsedPage - 1) * parsedLimit;
  return { parsedPage, parsedLimit, skip };
}

/**
 * Build the standard pagination response object.
 */
export function buildPagination(parsedPage, parsedLimit, total) {
  return {
    currentPage: parsedPage,
    totalPages: Math.ceil(total / parsedLimit),
    total,
    hasMore: parsedPage * parsedLimit < total,
  };
}

/**
 * Set status 404 and throw a not-found error.
 * Must be called inside a try/catch that passes to next(error).
 */
export function notFound(res, message) {
  res.status(404);
  throw new Error(message);
}
