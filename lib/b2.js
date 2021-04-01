/**
 * @file Defines the main B2 API client class.
 */

import axios from 'axios';
import axoisAuthRefresh from 'axios-auth-refresh';
import axiosRetry from 'axios-retry';
import debug from 'debug';
import { version } from '../package.json';
import BucketActions from './actions/bucket';
import FileActions from './actions/file';
import KeyActions from './actions/key';
import { API_BASE_URL, API_VERSION } from './constants';
import { BadRequestError, UnauthorizedError } from './errors';
import { getAccountAuthorizationHeader } from './utils';

/**
 * @typedef {object} B2Credentials
 * @property {string} applicationKeyId The Account ID or Application Key ID.
 * @property {string} applicationKey   The Master Key or Application Key.
 */

/**
 * @typedef {object} B2Authorization
 * @property {string}       accountId               The identifier for the account.
 * @property {string}       authorizationToken      An authorization token to use with all calls.
 * @property {B2KeyAllowed} allowed                 The capabilities of this auth token, and any restrictions on using it.
 * @property {string}       apiUrl                  The base URL to use for all API calls except for uploading and downloading files.
 * @property {string}       downloadUrl             The base URL to use for downloading files.
 * @property {number}       recommendedPartSize     The recommended size for each part of a large file.
 * @property {number}       absoluteMinimumPartSize The smallest possible size of a part of a large file (except the last part).
 */

/**
 * @typedef {object} B2KeyAllowed
 * @property {B2KeyCapability[]} capabilities A list of strings, each one naming a capability the key has.
 * @property {string} [bucketId]              When present, access is restricted to one bucket.
 * @property {string} [bucketName]            When present, access is restricted to one bucket.
 * @property {string} [namePrefix]            When present, access is restricted to files whose names start with the prefix.
 */

/**
 * Class for interacting with the Backblaze B2 API.
 * 
 * @class
 * @public
 * @param {B2Credentials}   credentials             Backblaze B2 API credentials.
 * @param {object}          [options]               Extra options.
 * @param {B2Authorization} [options.authorization] Initialize with existing authorization parameters.
 * @param {number}          [options.retry]         Optional config for `axios-retry`.
 */
class B2 {
	constructor(credentials, options = {}) {
		this.debug = debug('backblaze-b2');

		/**
		 * @type {B2Credentials}
		 */
		this.credentials = credentials;

		/**
		 * @type {B2Authorization}
		 */
		this.authorization = options.authorization || null;

		/**
		 * @type {AxiosInstance}
		 */
		this.client = axios.create({
			headers: {
				'User-Agent': `b2-js-sdk/${version}+nodejs/${process.version} https://github.com/zaxbux/b2-js-sdk`,
			},
			...options.axios,
		});

		this.debug('axios defaults', this.client.defaults);

		// Catch errors and return custom errors.
		this.client.interceptors.response.use(
			response => response,
			error => {
				if (error.response.status === 400) {
					throw new BadRequestError(error.response.data);
				}

				if (error.response.status === 401) {
					throw new UnauthorizedError(error.response.data);
				}

				return Promise.reject(error);
			}
		);

		// Automatically refresh authorization tokens
		axoisAuthRefresh(this.client, async (error) => {
			await this.authorize();
			
			// Use new token when retrying the failed request
			error.response.config.headers['Authorization'] = this.authorization.authorizationToken;
			return Promise.resolve();
		});

		// Use authorization token on every request
		this.client.interceptors.request.use(request => {
			request.headers['Authorization'] = this.authorization.authorizationToken;

			return request;
		});

		/*
			allows an optional retry config object that overrides the default retry behaviour
			please see https://github.com/softonic/axios-retry for additional options
			retries 3 times by default
			retries only on network errors and 5xx errors on indempotent requests (GET, HEAD, OPTIONS, PUT, or DELETE) by default
		*/
		axiosRetry(this.client, { retries: 3, ...options.retry });
	}

	/**
	 * Get an authorization token for interacting with the rest of the B2 API.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_authorize_account.html}.
	 * 
	 * @async
	 * @returns {AxiosResponse}
	 * @throws {UnauthorizedError}
	 */
	async authorize() {
		try {
			const response = await axios.request({
				url: `${API_BASE_URL}/b2api/${API_VERSION}/b2_authorize_account`,
				headers: {
					Authorization: getAccountAuthorizationHeader(this.credentials),
				},
			});

			this.authorization = response.data;
			this.client.defaults.baseURL = `${this.authorization.apiUrl}/b2api/${API_VERSION}`;

			return response;
		} catch (error) {
			throw error;
		}
	}

	/**
	 * @returns {BucketActions}
	 */
	get bucket() {
		return new BucketActions(this);
	}

	/**
	 * @returns {FileActions}
	 */
	get file() {
		return new FileActions(this);
	}

	/**
	 * @returns {KeyActions}
	 */
	get key() {
		return new KeyActions(this);
	}
}

export default B2;
