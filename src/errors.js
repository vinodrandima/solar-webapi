class ApiError extends Error {
    constructor(statusCode, code, message, details = null) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
    }
}

class NotFoundError extends ApiError {
    constructor(message = 'Resource not found') {
        super(404, 'NOT_FOUND', message);
    }
}

class ValidationError extends ApiError {
    constructor(message = 'Validation failed', details = null) {
        super(400, 'VALIDATION_ERROR', message, details);
    }
}

class UnauthorizedError extends ApiError {
    constructor(message = 'Authentication required') {
        super(401, 'UNAUTHORIZED', message);
    }
}

class ForbiddenError extends ApiError {
    constructor(message = 'Access denied') {
        super(403, 'FORBIDDEN', message);
    }
}

class ConflictError extends ApiError {
    constructor(message = 'Resource conflict') {
        super(409, 'CONFLICT', message);
    }
}

class PreconditionFailedError extends ApiError {
    constructor(message = 'Precondition Failed') {
        super(412, 'PRECONDITION_FAILED', message);
    }
}

const errorHandler = (err, req, res, next) => {
    // Content negotiation: check if client accepts JSON
    if (!req.accepts('json') && !req.accepts('*/*')) {
        return res.status(406).json({
            error: {
                code: 'NOT_ACCEPTABLE',
                message: 'This API only produces application/json'
            }
        });
    }

    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            error: {
                code: err.code,
                message: err.message,
                ...(err.details && { details: err.details })
            }
        });
    }

    console.error(err);
    res.status(500).json({
        error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'An unexpected error occurred'
        }
    });
};

const notFoundHandler = (req, res, next) => {
    next(new NotFoundError(`Route ${req.method} ${req.originalUrl} not found`));
};

module.exports = {
    ApiError,
    NotFoundError,
    ValidationError,
    UnauthorizedError,
    ForbiddenError,
    ConflictError,
    PreconditionFailedError,
    errorHandler,
    notFoundHandler
};
