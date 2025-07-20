/**
 * API Utilities
 *
 * Standardized error handling and response formatting for API routes.
 * Provides consistent error structure and logging across the application.
 */

/**
 * Standard API error response format
 */
export class ApiError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.name = 'ApiError';
  }
}

/**
 * Common API error types
 */
export const ApiErrors = {
  BAD_REQUEST: (message = 'Invalid request') => new ApiError(message, 400, 'BAD_REQUEST'),

  UNAUTHORIZED: (message = 'Unauthorized') => new ApiError(message, 401, 'UNAUTHORIZED'),

  NOT_FOUND: (message = 'Resource not found') => new ApiError(message, 404, 'NOT_FOUND'),

  RATE_LIMITED: (message = 'Too many requests') => new ApiError(message, 429, 'RATE_LIMITED'),

  SERVICE_UNAVAILABLE: (message = 'Service temporarily unavailable') =>
    new ApiError(message, 503, 'SERVICE_UNAVAILABLE'),

  EXTERNAL_SERVICE: (message = 'External service error') =>
    new ApiError(message, 502, 'EXTERNAL_SERVICE_ERROR'),

  INTERNAL_ERROR: (message = 'Internal server error') =>
    new ApiError(message, 500, 'INTERNAL_ERROR'),
};

/**
 * Standardized success response format
 *
 * @param {any} data - Response data
 * @param {string} message - Optional success message
 * @param {Object} meta - Optional metadata (pagination, etc.)
 */
export function successResponse(data, message = 'Success', meta = {}) {
  return {
    success: true,
    message,
    data,
    meta,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Standardized error response format
 *
 * @param {ApiError|Error} error - Error object
 * @param {string} requestId - Optional request ID for tracking
 */
export function errorResponse(error, requestId = null) {
  const response = {
    success: false,
    error: {
      message: error.message || 'An unexpected error occurred',
      code: error.code || 'UNKNOWN_ERROR',
      ...(requestId && { requestId }),
    },
    timestamp: new Date().toISOString(),
  };

  // Add stack trace in development
  if (process.env.NODE_ENV === 'development' && error.stack) {
    response.error.stack = error.stack;
  }

  return response;
}

/**
 * API route wrapper with standardized error handling
 *
 * @param {Function} handler - The API route handler function
 * @returns {Function} Wrapped handler with error handling
 */
export function withErrorHandling(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      // Log error for monitoring
      console.error(`API Error [${req.method} ${req.url}]:`, error);

      // Send standardized error response
      const statusCode = error.statusCode || 500;
      const response = errorResponse(error);

      res.status(statusCode).json(response);
    }
  };
}

/**
 * Validate required fields in request body
 *
 * @param {Object} body - Request body
 * @param {string[]} requiredFields - Array of required field names
 * @throws {ApiError} If validation fails
 */
export function validateRequiredFields(body, requiredFields) {
  const missing = requiredFields.filter(field => !body[field]);

  if (missing.length > 0) {
    throw ApiErrors.BAD_REQUEST(`Missing required fields: ${missing.join(', ')}`);
  }
}

/**
 * Rate limiting check (basic implementation)
 * In production, use a proper rate limiting solution like Redis
 *
 * @param {string} identifier - Client identifier (IP, user ID, etc.)
 * @param {number} limit - Request limit
 * @param {number} windowMs - Time window in milliseconds
 */
const rateLimitStore = new Map();

export function checkRateLimit(identifier, limit = 100, windowMs = 60000) {
  const now = Date.now();
  const key = identifier;

  if (!rateLimitStore.has(key)) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  const record = rateLimitStore.get(key);

  if (now > record.resetTime) {
    // Reset the counter
    record.count = 1;
    record.resetTime = now + windowMs;
    return true;
  }

  if (record.count >= limit) {
    throw ApiErrors.RATE_LIMITED('Rate limit exceeded');
  }

  record.count++;
  return true;
}

/**
 * Clean up expired rate limit entries
 * Should be called periodically in production
 */
export function cleanupRateLimit() {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}
