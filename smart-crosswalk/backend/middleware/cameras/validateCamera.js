/**
 * Validate that the camera status is a valid enum value.
 */
export function validateCameraStatus(req, res, next) {
  const { status } = req.body;
  const validStatuses = ["active", "inactive", "error"];

  if (!status) {
    res.status(400);
    return next(new Error("status is required"));
  }

  if (!validStatuses.includes(status)) {
    res.status(400);
    return next(
      new Error(
        `Invalid camera status: "${status}". Must be one of: ${validStatuses.join(", ")}`
      )
    );
  }

  next();
}
