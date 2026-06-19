/**
 * queryKeys — centralized React Query cache keys.
 *
 * Every query and invalidation in the app should reference these constants
 * instead of hard-coding string arrays. This prevents typos and makes it
 * easy to find every place a particular cache is read or invalidated.
 */
export const queryKeys = {
  alerts: {
    all: ["alerts"],
    list: (page, filters = null) => ["alerts", "list", page, filters],
    stats: ["alerts-stats"],
  },

  crosswalks: {
    all: ["crosswalks"],
    list: (page) => ["crosswalks", "list", page],
    stats: ["crosswalks-stats"],
    detail: (id) => ["crosswalk", id],
    alertsPrefix: (id) => ["crosswalk-alerts", id],
    alerts: (id, filters, page) => ["crosswalk-alerts", id, filters, page],
    detailStats: (id) => ["crosswalk-stats", id],
  },

  cameras: {
    all: ["cameras"],
  },

  leds: {
    all: ["leds"],
  },
};
