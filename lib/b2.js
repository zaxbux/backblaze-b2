import axios from 'axios';
import debug from 'debug';
import { version } from '../package.json';
import BucketActions from './actions/bucket';
import FileActions from './actions/file';
import KeyActions from './actions/key';
import { API_BASE_URL, API_VERSION, HTTP_STATUS_CODES } from './constants';
import { InvalidArgumentError, handleResponseError } from './errors';
import { getAccountAuthorizationHeader } from './utils';

/**
 * @typedef {object} B2Credentials
 * @property {string} applicationKeyId The Account ID or Application Key ID.
 * @property {string} applicationKey   The Master Key or Application Key.
 */

/**
 * @typedef {object} B2KeyAllowed
 * @property {B2KeyCapability[]} capabilities A list of strings, each one naming a capability the key has.
 * @property {string} [bucketId]              When present, access is restricted to one bucket.
 * @property {string} [bucketName]            When present, access is restricted to one bucket.
 * @property {string} [namePrefix]            When present, access is restricted to files whose names start with the prefix.
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
 * Class for interacting with the Backblaze B2 API.
 * 
 * @param {B2Credentials}      credentials             Backblaze B2 API credentials.
 * @param {object}             [options]               Extra options.
 * @param {B2Authorization}    [options.authorization] Initialize with existing authorization parameters.
 * @param {AxiosRequestConfig} [options.axios]         Additional config for axios.
 * @param {boolean}            [options.hydrate=true]  Hydrate native objects that represent Keys, Buckets, Files, etc from API responses.
 * @throws {InvalidArgumentError}
 */
class B2 {
	constructor(credentials, options = {}) {
		this.debug = debug('backblaze-b2');

		if (!credentials) {
			throw new InvalidArgumentError('The `credentials` argument is required');
		}

		this.options = Object.assign({}, {
			axios: {},
			hydrate: true,
		}, options);

		/**
		 * @type {B2Credentials}
		 */
		this.credentials = credentials;

		/**
		 * @type {B2Authorization}
		 */
		this.authorization = this.options.authorization || {};

		/**
		 * @type {AxiosInstance}
		 */
		this.client = axios.create({
			headers: {
				'User-Agent': `b2-js-sdk/${version}+nodejs/${process.version} https://github.com/zaxbux/b2-js-sdk`,
			},
			maxBodyLength: 7000,
			...this.options.axios,
		});

		this.debug('axios defaults', this.client.defaults);

		// Use authorization token on every request
		this.client.interceptors.request.use(config => {
			const authorizationToken = this.authorization.authorizationToken;

			if (authorizationToken) {
				config.headers.Authorization = authorizationToken;
			}

			return config;
		}, error => {
			return Promise.reject(error);
		});

		// Catch response errors and return custom errors.
		this.client.interceptors.response.use(
			response => response,
			async (error) => {
				return await handleResponseError(error, this);
			}
		);
	}

	/**
	 * Get an authorization token for interacting with the rest of the B2 API.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_authorize_account.html}.
	 * 
	 * @async
	 * @returns {AxiosResponse}
	 */
	async authorize() {
		const response = await this.client.request({
			url: `${API_BASE_URL}/b2api/${API_VERSION}/b2_authorize_account`,
			headers: {
				Authorization: getAccountAuthorizationHeader(this.credentials),
			},
		});

		if (response.status === HTTP_STATUS_CODES.OK) {
			this.authorization = response.data;
			this.client.defaults.baseURL = `${this.authorization.apiUrl}/b2api/${API_VERSION}`;
		}

		return response;
	}

	/**
	 * Check if this instance has been authorized.
	 * 
	 * @returns {boolean}
	 */
	isAuthorized() {
		if (this.authorization && this.authorization.authorizationToken) {
			return true;
		}

		return false;
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
