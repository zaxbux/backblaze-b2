import { isArrayBuffer, isBuffer, isBlob } from 'axios/lib/utils';
import { createHash } from 'crypto';
import { MAX_INFO_HEADERS } from './constants';
import { InvalidArgumentError } from './errors';

/**
 * @typedef {import('./file').B2SSEConfig} B2SSEConfig
 */

/**
 * Encode unicode characters in a way that the B2 API expects.
 * 
 * See {@link https://www.backblaze.com/b2/docs/string_encoding.html}.
 * 
 * @param {string} string String to encode.
 * @returns {string}
 */
export function encodeB2String(string) {
	return new String(string).split('/').map(encodeURIComponent).join('/');
}

/**
 * Test if header name conforms to section 3.2.6 of RFC 7230.
 * 
 * See {@link https://tools.ietf.org/html/rfc7230#section-3.2.6}
 * and {@link https://www.backblaze.com/b2/docs/files.html#fileInfo}.
 * 
 * @param {string} fieldName The header name to test.
 * @returns {boolean}
 */
export function isValidHeaderName(fieldName) {
	return /^[a-z0-9!#$%&'*+-.^_`|~]+$/i.test(fieldName);
}

/**
 * Construct an object containing validated and prefixed `X-Bz-Info-*` headers.
 * 
 * See {@link https://www.backblaze.com/b2/docs/files.html#fileInfo}.
 * 
 * @param {Object.<string, string>} fileInfo Custom information.
 * @returns {Object.<string, string>}
 * @throws {InvalidArgumentError} When the arguments do not pass validation.
 */
export function makeBzInfoHeaders(fileInfo) {
	/**
	 * @type {Object.<string, string>}
	 */
	let headers = {};

	const keys = Object.keys(fileInfo || {});

	if (keys.length > MAX_INFO_HEADERS) {
		throw new InvalidArgumentError(`Maximum of ${MAX_INFO_HEADERS} X-Bz-Info-* headers allowed`);
	}

	keys.forEach((infoKey) => {
		let header = infoKey;

		if (!isValidHeaderName(header)) {
			throw new InvalidArgumentError(`X-Bz-Info header "${header}" contains invalid characters`);
		}

		// Add prefix to header name
		if (!header.toLowerCase().startsWith('x-bz-info')) {
			header = 'X-Bz-Info-' + header;
		}

		if (typeof fileInfo[infoKey] !== 'string') {
			throw new InvalidArgumentError(`${header} header value must be a string`);
		}

		headers[header] = encodeB2String(fileInfo[infoKey]);
	});

	return headers;
}

/**
 * Attempt to get the content length from possible data objects.
 * 
 * @param {(string|ArrayBuffer|Buffer|Blob)} data Data to return length for.
 * @returns {number?}
 */
export function getContentLength(data) {
	if (isArrayBuffer(data)) {
		// @ts-ignore
		return data.byteLength;
	}

	// Buffer is node only
	if (typeof data === 'string' || isBuffer(data)) {
		// @ts-ignore
		return data.length;
	}
	
	// browsers only
	if (isBlob(data)) {
		// @ts-ignore
		return data.size;
	}

	return null;
}

/**
 * Construct an object containing the proper headers for B2 Server-Side Encryption.
 * 
 * @param {B2SSEConfig} config The SSE parameters to use.
 * @returns {object}
 */
export function makeB2SSEHeaders(config) {
	if (config.mode === 'SSE-B2') {
		return {
			'X-Bz-Server-Side-Encryption': config.algorithm,
		};
	}

	if (config.mode === 'SSE-C') {
		return {
			'X-Bz-Server-Side-Encryption-Customer-Algorithm': config.algorithm,
			'X-Bz-Server-Side-Encryption-Customer-Key':       Buffer.from(config.customerKey).toString('base64'),
			'X-Bz-Server-Side-Encryption-Customer-Key-Md5':   Buffer.from(config.customerKeyMd5).toString('base64'),
		};
	}
}

/**
 * Creates a SHA1 checksum of the provided data.
 * 
 * @param {Buffer|TypedArray|DataView} data The data to create a hash for.
 * @returns {string}
 */
export function createSHA1Checksum(data) {
	return createHash('sha1').update(data).digest('hex');
}

/**
 * Get a sorted array of part checksums from an object.
 * 
 * @param {object} partChecksums Object containing numeric keys and SHA1 checksum values.
 * @returns {Array}
 */
export function getPartSha1Array(partChecksums) {
	const sortedKeys = Object.keys(partChecksums).sort();

	const sortedParts = [];

	sortedKeys.forEach((partIndex) => {
		sortedParts.push(partChecksums[partIndex]);
	});

	return sortedParts;
}

/**
 * Test if a URL pathname ends with one or more values.
 * 
 * @param {string|URL} url 
 * @param {string|string[]} test 
 * @returns {boolean}
 */
export function urlPathnameEndsWith(url, test) {
	if (typeof test === 'string') {
		test = [test];
	}

	return test.some(value => {
		if (url instanceof URL) {
			return url.pathname.endsWith(value);
		}

		return url.endsWith(value);
	});
}

/**
 * Converts an array of two numbers to a range string.
 * 
 * @param {string|Array<number>} range 
 * @returns {string}
 */
export function rangeArrayToString(range) {
	if (range instanceof Array && range.length === 2) {
		if (range[0] < range[1]) {
			return `${range[0]}-${range[1]}`;
		}
	}

	// @ts-ignore
	return range;
}