/**
 * @fileoverview Helper module for sending logs to Graylog with correlation IDs
 * @module graylogHelper
 */

const http = require('node:http');

/**
 * Sends a log message to Graylog with the correlation ID
 * 
 * @async
 * @function sendLogToGraylog
 * @param {string} correlationId - The correlation ID to include in the log
 * @returns {Promise<void>} Promise that resolves when the log has been sent
 * @example
 * // Send a log with a correlation ID
 * sendLogToGraylog('123e4567-e89b-12d3-a456-426614174000')
 *   .catch(err => console.error('Failed to send log:', err));
 */
function sendLogToGraylog(correlationId) {
    // If there's no correlationId, just return
    if (!correlationId) {
        return Promise.resolve();
    }

    /**
     * @type {Object} logMessage - The GELF format log message
     * @property {string} host - The host name generating the log
     * @property {string} version - The GELF spec version
     * @property {string} short_message - A brief description of the log event
     * @property {number} timestamp - Unix timestamp of the log event
     * @property {number} level - Syslog severity level (6=Informational)
     * @property {string} id-hly - Custom field containing the correlation ID
     */
    const logMessage = {
        host: "holafly.com",
        version: "1.1",
        short_message: "Request correlation tracking",
        timestamp: Math.floor(Date.now() / 1000),
        level: 6,
        'id-hly': correlationId
    };

    const data = JSON.stringify(logMessage);

    /**
     * @type {Object} options - HTTP request configuration
     */
    const options = {
        hostname: 'localhost',
        port: 12201,
        path: '/gelf',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    };

    return new Promise((resolve) => {
        const req = http.request(options, (res) => {
            let response = '';
            res.on('data', chunk => response += chunk);
            res.on('end', () => {
                resolve();
            });
        });
        
        req.on('error', error => {
            // Silently handle errors to avoid breaking the application flow
            // but log to console for debugging
            console.error('Error sending log to Graylog:', error.message);
            resolve();
        });

        req.write(data);
        req.end();
    });
}

module.exports = { sendLogToGraylog };