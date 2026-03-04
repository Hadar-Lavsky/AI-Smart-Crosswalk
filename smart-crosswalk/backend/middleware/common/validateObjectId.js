import mongoose from "mongoose";

/**
 * Factory function that returns middleware to validate a route parameter
 * is a valid MongoDB ObjectId.
 *
 * @param {string} paramName - The route parameter name to validate (default: 'id')
 * @returns {Function} Express middleware
 */
export const validateObjectId =
  (paramName = "id") =>
  (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params[paramName])) {
      res.status(400);
      return next(
        new Error(`Invalid ${paramName}: ${req.params[paramName]}`)
      );
    }
    next();
  };
