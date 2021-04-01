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
