/**
 * Validate that required location fields are present when creating a crosswalk.
 */
export function validateCreateCrosswalk(req, res, next) {
  const { location } = req.body;

  if (!location?.city || !location?.street || !location?.number) {
    res.status(400);
    return next(
      new Error(
        "Missing required fields: location.city, location.street, location.number"
      )
    );
  }

  next();
}

/**
 * Validate that cameraId is present in the request body.
 */
export function validateLinkCamera(req, res, next) {
  const { cameraId } = req.body;

  if (!cameraId) {
    res.status(400);
    return next(new Error("cameraId is required"));
  }

  next();
}

/**
 * Validate that ledId is present in the request body.
 */
export function validateLinkLED(req, res, next) {
  const { ledId } = req.body;

  if (!ledId) {
    res.status(400);
    return next(new Error("ledId is required"));
  }

  next();
}

/**
 * Validate that the search query parameter `q` is present and at least 2 characters.
 */
export function validateSearchQuery(req, res, next) {
  const { q } = req.query;

  if (!q) {
    res.status(400);
    return next(new Error('Query parameter "q" is required'));
  }

  if (q.length < 2) {
    res.status(400);
    return next(
      new Error('Query parameter "q" must be at least 2 characters')
    );
  }

  next();
}
