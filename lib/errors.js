/**
 * @file Defines error classes.
 */

import { HTTP_STATUS_CODES } from './constants';

export const B2_ERROR_CODES = {
	// 400
	BAD_REQUEST: 'bad_request',
	TOO_MANY_BUCKETS: 'too_many_buckets', // b2_create_bucket
	DUPLICATE_BUCKET_NAME: 'duplicate_bucket_name', // b2_create_bucket
	FILE_NOT_PRESENT: 'file_not_present', // b2_delete_file_version
	OUT_OF_RANGE: 'out_of_range', // b2_list_file_*
	INVALID_BUCKET_ID: 'invalid_bucket_id', // b2_list_file_*
	BAD_BUCKET_ID: 'bad_bucket_id', // b2_start_large_file
	INVALID_FILE_ID: 'invalid_file_id', // b2_list_file_versions

	// 401
	UNSUPPORTED: 'unsupported', // b2_authorize_account
	UNAUTHORIZED: 'unauthorized',
	BAD_AUTH_TOKEN: 'bad_auth_token',
	EXPIRED_AUTH_TOKEN: 'expired_auth_token',
	//ACCESS_DENIED: 'access_denied', // b2_delete_file_version

	// 403
	CAP_EXCEEDED: 'cap_exceeded', // b2_upload_file, b2_copy_file, b2_copy_part
	STORAGE_CAP_EXCEEDED: 'storage_cap_exceeded', // b2_get_upload_url
	TRANSACTION_CAP_EXCEEDED: 'transaction_cap_exceeded', // b2_authorize_account
	ACCESS_DENIED: 'access_denied', // b2_copy_file, b2_download_file_by_*
	DOWNLOAD_CAP_EXCEEDED: 'download_cap_exceeded', // b2_download_file_by_*

	// 404
	NOT_FOUND: 'not_found', // b2_copy_file, b2_copy_part, b2_download_file_by_*, b2_get_file_info, b2_hide_file

	// 405
	METHOD_NOT_ALLOWED: 'method_not_allowed',

	// 408
	REQUEST_TIMEOUT: 'request_timeout',

	// 409
	CONFLICT: 'conflict', // b2_update_bucket

	// 416
	RANGE_NOT_SATISFIABLE: 'range_not_satisfiable', // b2_copy_file, b2_copy_part, b2_download_file_by_*

	// 503
	SERVICE_UNAVAILABLE: 'service_unavailable', // b2_get_download_authorization, b2_get_upload_url, b2_upload_file
	//BAD_REQUEST: 'bad_request', // b2_list_file_*
};

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
	 * @param {AxiosError} error Error information returned by the B2 API.
	 * @param {*}          [args]  Additional arguments.
	 */
	constructor(error, ...args) {
		super(error.response.data.message || error.response.data.code, ...args);

		/**
		 * @type {AxiosError}
		 */
		this.axiosError = error;
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
export class TooManyBucketsError extends BadRequestError {}
export class DuplicateBucketNameError extends BadRequestError {}
export class UnauthorizedError extends B2RequestError {}
export class BadAuthTokenError extends UnauthorizedError {}
export class ExpiredAuthTokenError extends UnauthorizedError {}
export class NotFoundError extends B2RequestError {}
export class ForbiddenError extends B2RequestError {}
export class CapExceededError extends ForbiddenError {}
export class StorageCapExceededError extends ForbiddenError {}
export class MethodNotAllowedError extends B2RequestError {}
export class RequestTimeoutError extends B2RequestError {}
export class TooManyRequestsError extends B2RequestError {}
export class InternalError extends B2RequestError {}
export class ServiceUnavailableError extends B2RequestError {}

/**
 * Handle response errors and return custom errors.
 * 
 * @param {AxiosError} error The error object from Axios.
 * @param {B2}         b2    Instance of the B2 API client.
 * @returns {Promise<AxiosResponse>}
 * @throws {B2RequestError}
 */
export async function handleResponseError(error, b2) {
	const originalRequest = error.config;

	// If the error response doesn't have B2 info, reject early.
	if (!error.response || !error.response.data || !error.response.data.code) {
		return Promise.reject(error);
	}

	if (error.response.status === HTTP_STATUS_CODES.BAD_REQUEST) {
		if (error.response.data.code === B2_ERROR_CODES.TOO_MANY_BUCKETS) {
			throw new TooManyBucketsError(error);
		}

		if (error.response.data.code === B2_ERROR_CODES.DUPLICATE_BUCKET_NAME) {
			throw new DuplicateBucketNameError(error);
		}

		throw new BadRequestError(error);
	}

	if (error.response.status === HTTP_STATUS_CODES.UNAUTHORIZED) {

		if (originalRequest.url.endsWith('/b2_authorize_account')) {
			throw new UnauthorizedError(error);
		}

		if (!originalRequest._retry && (
			(error.response.data.code === B2_ERROR_CODES.BAD_AUTH_TOKEN) ||
			(error.response.data.code ===  B2_ERROR_CODES.EXPIRED_AUTH_TOKEN)
		)) {
			originalRequest._retry = true;

			const authResponse = await b2.authorize();

			originalRequest.headers.Authorization = authResponse.data.authorizationToken;

			return b2.client.request(originalRequest);
		}

		if (error.response.data.code === B2_ERROR_CODES.BAD_AUTH_TOKEN) {
			throw new BadAuthTokenError(error);
		}

		if (error.response.data.code ===  B2_ERROR_CODES.EXPIRED_AUTH_TOKEN) {
			throw new ExpiredAuthTokenError(error);
		}

		throw new UnauthorizedError(error);

	}

	if (error.response.status === HTTP_STATUS_CODES.NOT_FOUND) {
		throw new NotFoundError(error);
	}

	if (error.response.status === HTTP_STATUS_CODES.FORBIDDEN) {
		if (error.response.data.code === B2_ERROR_CODES.CAP_EXCEEDED) {
			throw new CapExceededError(error);
		}

		if (error.response.data.code === B2_ERROR_CODES.STORAGE_CAP_EXCEEDED) {
			throw new StorageCapExceededError(error);
		}

		throw new ForbiddenError(error);
	}

	if (error.response.status === HTTP_STATUS_CODES.METHOD_NOT_ALLOWED) {
		if (error.response.data.code === B2_ERROR_CODES.METHOD_NOT_ALLOWED) {
			throw new MethodNotAllowedError(error);
		}

		throw new MethodNotAllowedError(error);
	}

	if (error.response.status === HTTP_STATUS_CODES.REQUEST_TIMEOUT) {
		if (error.response.data.code === B2_ERROR_CODES.REQUEST_TIMEOUT) {
			throw new RequestTimeoutError(error);
		}

		throw new RequestTimeoutError(error);
	}

	if (error.response.status === HTTP_STATUS_CODES.SERVICE_UNAVAILABLE) {
		if (error.response.data.code === B2_ERROR_CODES.SERVICE_UNAVAILABLE) {
			throw new ServiceUnavailableError(error);
		}

		throw new ServiceUnavailableError(error);
	}

	throw new B2RequestError(error);
}
