/**
 * @file Defines global constants.
 * @author Zachary Schneider <hello@zacharyschneider.ca>
 */

/**
 * @type {string} The version of the B2 API to make requests to.
 */
export const API_VERSION = 'v2';

/**
 * @type {string} The fixed URL to make authorization requests to.
 */
export const API_BASE_URL = 'https://api.backblazeb2.com';

/**
 * @type {number} The maximum number of custom x-bz-info-* headers.
 */
export const MAX_INFO_HEADERS  = 10;

/**
 * @type {string} The Content-Type "flag" that gets B2 to determine the true Content-Type.
 */
export const CONTENT_TYPE_AUTO = 'b2/x-auto';

/**
 * @type {object} Standard HTTP status codes.
 */
export const HTTP_STATUS_CODES = {
	OK: 200,
	BAD_REQUEST: 400,
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	NOT_FOUND: 404,
	METHOD_NOT_ALLOWED: 405,
	REQUEST_TIMEOUT: 408,
	TOO_MANY_REQUESTS: 429,
	INTERNAL_SERVER_ERROR: 500,
	SERVICE_UNAVAILABLE: 503,
};