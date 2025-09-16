/**
 * Response Helper Utility - INGAIN Platform
 * 
 * Provides standardized response formatting across all APIs to ensure
 * consistency with frontend expectations.
 * 
 * @author Yash Singh (ER_SKY)
 * @version 1.0.0
 */

/**
 * Standard success response format
 * @param {any} data - Response data
 * @param {string} message - Success message
 * @param {number} status - HTTP status code
 * @returns {Object} Standardized response
 */
const successResponse = (data = null, message = 'Success', status = 200) => {
    return {
        success: true,
        message,
        data,
        status
    };
};

/**
 * Standard error response format
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @param {Array} errors - Array of error details
 * @returns {Object} Standardized error response
 */
const errorResponse = (message = 'An error occurred', status = 500, errors = []) => {
    return {
        success: false,
        message,
        errors,
        status
    };
};

/**
 * Standard paginated response format
 * @param {Array} items - Array of items
 * @param {number} currentPage - Current page number
 * @param {number} totalPages - Total number of pages
 * @param {number} total - Total number of items
 * @param {number} limit - Items per page
 * @param {string} message - Success message
 * @returns {Object} Standardized paginated response
 */
const paginatedResponse = (items, currentPage, totalPages, total, limit, message = 'Data retrieved successfully') => {
    return {
        success: true,
        message,
        data: {
            items,
            currentPage,
            totalPages,
            total,
            limit
        },
        status: 200
    };
};

/**
 * Standard list response format (for non-paginated lists)
 * @param {Array} items - Array of items
 * @param {string} message - Success message
 * @returns {Object} Standardized list response
 */
const listResponse = (items, message = 'Data retrieved successfully') => {
    return {
        success: true,
        message,
        data: items,
        status: 200
    };
};

/**
 * Standard single item response format
 * @param {any} item - Single item
 * @param {string} message - Success message
 * @returns {Object} Standardized single item response
 */
const itemResponse = (item, message = 'Data retrieved successfully') => {
    return {
        success: true,
        message,
        data: item,
        status: 200
    };
};

/**
 * Standard created response format
 * @param {any} data - Created item data
 * @param {string} message - Success message
 * @returns {Object} Standardized created response
 */
const createdResponse = (data, message = 'Resource created successfully') => {
    return {
        success: true,
        message,
        data,
        status: 201
    };
};

/**
 * Standard updated response format
 * @param {any} data - Updated item data
 * @param {string} message - Success message
 * @returns {Object} Standardized updated response
 */
const updatedResponse = (data, message = 'Resource updated successfully') => {
    return {
        success: true,
        message,
        data,
        status: 200
    };
};

/**
 * Standard deleted response format
 * @param {string} message - Success message
 * @returns {Object} Standardized deleted response
 */
const deletedResponse = (message = 'Resource deleted successfully') => {
    return {
        success: true,
        message,
        status: 200
    };
};

/**
 * Validation error response format
 * @param {Array} errors - Array of validation errors
 * @param {string} message - Error message
 * @returns {Object} Standardized validation error response
 */
const validationErrorResponse = (errors, message = 'Validation failed') => {
    return {
        success: false,
        message,
        errors,
        status: 400
    };
};

/**
 * Not found error response format
 * @param {string} message - Error message
 * @returns {Object} Standardized not found response
 */
const notFoundResponse = (message = 'Resource not found') => {
    return {
        success: false,
        message,
        status: 404
    };
};

/**
 * Unauthorized error response format
 * @param {string} message - Error message
 * @returns {Object} Standardized unauthorized response
 */
const unauthorizedResponse = (message = 'Unauthorized access') => {
    return {
        success: false,
        message,
        status: 401
    };
};

/**
 * Forbidden error response format
 * @param {string} message - Error message
 * @returns {Object} Standardized forbidden response
 */
const forbiddenResponse = (message = 'Access forbidden') => {
    return {
        success: false,
        message,
        status: 403
    };
};

/**
 * Rate limit error response format
 * @param {string} message - Error message
 * @param {number} retryAfter - Seconds to wait before retry
 * @returns {Object} Standardized rate limit response
 */
const rateLimitResponse = (message = 'Rate limit exceeded', retryAfter = 60) => {
    return {
        success: false,
        message,
        retry_after: retryAfter,
        status: 429
    };
};

module.exports = {
    successResponse,
    errorResponse,
    paginatedResponse,
    listResponse,
    itemResponse,
    createdResponse,
    updatedResponse,
    deletedResponse,
    validationErrorResponse,
    notFoundResponse,
    unauthorizedResponse,
    forbiddenResponse,
    rateLimitResponse
};
