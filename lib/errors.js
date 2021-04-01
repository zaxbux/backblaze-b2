/**
 * @file Defines error classes.
 */

import debug from 'debug';

/**
 * @typedef {object} B2APIErrorResponse
 * @property {number} status  The numeric HTTP response code.
 * @property {string} code    A single-identifier code that identifies the error.
 * @property {string} message A human-readable message, in English, saying what went wrong.
 */

/**
 * Base class for B2 API SDK errors.
 * 
 * @class
 */
export class B2Error extends Error {
	constructor(...args) {
		super(...args);

		// Maintains proper stack trace for where our error was thrown
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, B2Error);
		}
	}
}

export class B2RequestError extends B2Error {
	/**
	 * 
	 * @param {B2APIErrorResponse} apiData Error information returned by the B2 API.
	 * @param {*}                  [args]  Additional arguments.
	 */
	constructor(apiData, ...args) {
		super(apiData.message, ...args);
		this.apiData = apiData;

		debug('backblaze-b2')('Request Error', this.apiData);
	}
}

/**
 * @classdesc B2 bucket does not exist.
 */
export class BucketNotFoundError extends B2Error {}

/**
 * @classdesc Invalid argument or parameter was passed.
 */
export class InvalidArgumentError extends B2Error {}

/**
 * @classdesc Invalid credentials were provided.
 */
export class InvalidCredentialsError extends B2Error {}

export class BadRequestError extends B2RequestError {}
export class UnauthorizedError extends B2RequestError {}
export class ForbiddenError extends B2RequestError {}
export class RequestTimeoutError extends B2RequestError {}
export class TooManyRequestsError extends B2RequestError {}
export class InternalError extends B2RequestError {}
export class ServiceUnavailableError extends B2RequestError {}