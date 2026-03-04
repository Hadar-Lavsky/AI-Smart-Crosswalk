/**
 * Middleware to parse the alert request body.
 * If `rawLocation` is a JSON string, parse it to an object
 * and attach to `req.body.location`.
 */
export function parseAlertBody(req, res, next) {
  const { rawLocation } = req.body;

  if (rawLocation) {
    try {
      req.body.location =
        typeof rawLocation === "string"
          ? JSON.parse(rawLocation)
          : rawLocation;
    } catch (e) {
      console.warn("Could not parse location:", rawLocation, e.message);
    }
  }

  next();
}
