import axios from 'axios';
import debug from 'debug';
import { version } from '../package.json';
import BucketActions from './actions/bucket';
import FileActions from './actions/file';
import KeyActions from './actions/key';
import LargeFileActions from './actions/largeFile';
import B2Authorization from './authorization';
import { API_BASE_URL, API_VERSION, HTTP_STATUS_CODES } from './constants';
import B2Credentials from './credentials';
import { handleResponseError, InvalidArgumentError } from './errors';

/**
 * @typedef {import('axios').AxiosInstance} AxiosInstance
 */

/**
 * @typedef {import('axios').AxiosRequestConfig} AxiosRequestConfig
 */

/**
 * @typedef {import('axios').AxiosResponse} AxiosResponse
 */

/**
 * @classdesc Class for interacting with the Backblaze B2 API.
 * 
 * @throws {InvalidArgumentError} When the arguments do not pass validation.
 */
class B2 {
	/**
	 * 
	 * @param {{applicationKeyId: string; applicationKey: string; } | B2Credentials} credentials Backblaze B2 API credentials.
	 * @param {object}               [options]               Extra options.
	 * @param {B2Authorization}      [options.authorization] Initialize with existing authorization parameters.
	 * @param {AxiosRequestConfig}   [options.axios]         Optional additional config for axios.
	 * @param {boolean}              [options.hydrate=true]  Hydrate native objects that represent Keys, Buckets, Files, etc from API responses.
	 */
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
		this.credentials = new B2Credentials(credentials.applicationKeyId, credentials.applicationKey);

		/**
		 * @type {B2Authorization}
		 */
		this.authorization = new B2Authorization(options.authorization);

		/**
		 * @type {AxiosInstance}
		 */
		this.client = axios.create(
			Object.assign({},
				{
					headers: {
						'User-Agent': `b2-js-sdk/${version}+nodejs/${process.version} https://github.com/zaxbux/b2-js-sdk`,
					},
					maxBodyLength: 7000,
				},
				this.options.axios || {},
			)
		);

		this.debug('axios defaults', this.client.defaults);

		// Use authorization token on every request
		this.client.interceptors.request.use(config => {
			const authorizationToken = this.authorization.authorizationToken;

			// Don't use account authorization token if the header is already set (e.g. upload/download calls)
			if (authorizationToken && !config.headers.Authorization) {
				config.headers.Authorization = authorizationToken;
			}

			// Remove undefined header values
			Object.keys(config.headers).forEach(key => config.headers[key] === undefined && delete config.headers[key]);

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
	 * @returns {Promise<AxiosResponse>}
	 */
	async authorize() {
		this.debug('authorize()');
		const response = await this.client.request({
			url: `${API_BASE_URL}/b2api/${API_VERSION}/b2_authorize_account`,
			headers: {
				Authorization: this.credentials.authorizationHeader,
			},
		});

		if (response.status === HTTP_STATUS_CODES.OK) {
			this.authorization.update(response.data);
			this.client.defaults.baseURL = `${this.authorization.apiUrl}/b2api/${API_VERSION}`;
		}

		return response;
	}

	/**
	 * @readonly
	 * @returns {BucketActions}
	 */
	get bucket() {
		if (!this._bucket) {
			this._bucket = new BucketActions(this);
		}

		return this._bucket;
	}

	/**
	 * @readonly
	 * @returns {FileActions}
	 */
	get file() {
		if (!this._file) {
			this._file = new FileActions(this);
		}

		return this._file;
	}

	/**
	 * @readonly
	 * @returns {LargeFileActions}
	 */
	get largeFile() {
		if (!this._largeFile) {
			this._largeFile = new LargeFileActions(this);
		}

		return this._largeFile;
	}

	/**
	 * @readonly
	 * @returns {KeyActions}
	 */
	get key() {
		if (!this._key) {
			this._key = new KeyActions(this);
		}

		return this._key;
	}
}

export default B2;
