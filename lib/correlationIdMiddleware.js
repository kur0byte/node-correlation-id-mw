/**
 * @fileoverview Middleware for handling correlation IDs in Express.js applications
 * @module correlationIdMiddleware
 */
const {correlator} = require('./correlationIdHelper');
const { sendLogToGraylog } = require('./graylogHelper');

/**
 * Creates a middleware for handling correlation IDs in HTTP requests
 * 
 * @param {Object} options - Configuration options for the middleware
 * @param {string} [options.header='x-correlation-id'] - The HTTP header name to use for correlation ID
 * @returns {Function} Express middleware function that handles correlation ID logic
 * @example
 * // Use default header 'x-correlation-id'
 * app.use(correlationMw());
 * 
 * // Use custom header name
 * app.use(correlationMw({ header: 'id-hly' }));
 */
function correlationMw (options) {
    const headerName = (options && options.header) || 'x-correlation-id';
    
    /**
     * Express middleware function
     * 
     * @param {Object} req - Express request object
     * @param {Object} res - Express response object
     * @param {Function} next - Express next middleware function
     */
    return (req, res, next) => {
        req.correlationId = correlator.getId;
        req.setCorrelationId = correlator.setId;
        
        const id = req.get(headerName);

        // First establish the correlation ID context, then send logs
        if (id && correlator.isUUID(id)) {
            correlator.withId(id, () => {
                res.set(headerName, id);
                
                // Now send log within the correlation context
                try {
                    sendLogToGraylog(id)
                        .catch(err => console.error('Logging error:', err))
                        .finally(() => next());
                } catch (err) {
                    console.error('Unexpected error with Graylog logging:', err);
                    next();
                }
            });
        } else {
            correlator.withId(() => {
                const newId = correlator.getId();
                res.set(headerName, newId);
                
                // Send log with the newly generated ID
                try {
                    sendLogToGraylog(newId)
                        .catch(err => console.error('Logging error:', err))
                        .finally(() => next());
                } catch (err) {
                    console.error('Unexpected error with Graylog logging:', err);
                    next();
                }
            });
        }
    };
}

/**
 * Get the current correlation ID
 * 
 * @function getId
 * @type {Function}
 * @returns {string|undefined} The current correlation ID, or undefined if not in a correlation context
 * @example
 * // Access correlation ID through middleware's static method
 * const id = correlationMw.getId();
 */
correlationMw.getId = correlator.getId;

/**
 * Set a correlation ID manually
 * 
 * @function setId
 * @type {Function}
 * @param {string} id - The correlation ID to set
 * @throws {Error} If not called within a correlation context
 * @example
 * // Set correlation ID through middleware's static method
 * correlationMw.setId('123e4567-e89b-12d3-a456-426614174000');
 */
correlationMw.setId = correlator.setId;

module.exports = { correlationMw };