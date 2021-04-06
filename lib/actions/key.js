/**
 * @file Keys actions.
 */

import { InvalidArgumentError } from '../errors';
import Key from '../key';
import B2Action from './base';

/**
 * @class
 * @classdesc Methods for managing B2 application keys.
 * 
 * See {@link https://www.backblaze.com/b2/docs/application_keys.html}.
 * 
 * @augments B2Action
 */
class KeyActions extends B2Action {

	/**
	 * Creates a new application key.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_create_key.html}.
	 * 
	 * @param {object}            args                          Method arguments.
	 * @param {B2KeyCapability[]} args.capabilities             Capabilities the new key should have.
	 * @param {string}            args.keyName                  Name for this key.
	 * @param {number}            [args.validDurationInSeconds] When the key will expire.
	 * @param {string}            [args.bucketId]               Restricts access to one bucket.
	 * @param {string}            [args.namePrefix]             Restricts access to files whose names start with the prefix.
	 * @returns {Promise<AxiosResponse>}
	 * @throws {InvalidArgumentError} When the arguments do not pass validation.
	 */
	async create(args) {
		if (!args || !args.keyName) {
			throw new InvalidArgumentError('The `keyName` parameter is required');
		}

		if (!args.capabilities) {
			throw new InvalidArgumentError('The `capabilities` parameter is required');
		}

		return await this._b2.client.post('/b2_create_key', {
			accountId:              this._b2.authorization.accountId,
			capabilities:           args.capabilities,
			keyName:                args.keyName,
			validDurationInSeconds: args.validDurationInSeconds || null,
			bucketId:               args.bucketId               || null,
			namePrefix:             args.namePrefix             || null,
		}, {
			transformResponse: (data) => this.transformResponse(data, (data) => {
				return new Key(data, this._b2);
			}),
		});
	}

	/**
	 * Deletes the application key specified.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_delete_key.html}.
	 * 
	 * @param {object} args                  Method arguments.
	 * @param {string} args.applicationKeyId The key to delete.
	 * @returns {Promise<AxiosResponse>}
	 * @throws {InvalidArgumentError} When the arguments do not pass validation.
	 */
	async delete(args) {
		if (!args || !args.applicationKeyId) {
			throw new InvalidArgumentError('The `applicationKeyId` parameter is required');
		}

		return await this._b2.client.post('/b2_delete_key', {
			applicationKeyId: args.applicationKeyId,
		});
	}

	/**
	 * Lists application keys associated with an account.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_list_keys.html}.
	 * 
	 * @param {object} [args]                       Method arguments.
	 * @param {number} [args.maxKeyCount=1000]      Maximum number of keys to return.
	 * @param {string} [args.startApplicationKeyId] First key to return.
	 * @returns {Promise<AxiosResponse>}
	 * @throws {InvalidArgumentError} When the arguments do not pass validation.
	 */
	async list(args = {}) {
		return await this._b2.client.post('/b2_list_keys', {
			accountId: this._b2.authorization.accountId,
			maxKeyCount: args.maxKeyCount                     || 1000,
			startApplicationKeyId: args.startApplicationKeyId || null,
		}, {
			transformResponse: (data) => this.transformResponse(data, (data) => {
				if (data.keys) {
					data.keys = data.keys.map((key) => {
						return new Key(key, this._b2);
					}, this);
				}

				return data;
			}),
		});
	}

	/**
	 * Lists application keys associated with an account.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_list_keys.html}.
	 * 
	 * @param {object} [args]                       Method arguments.
	 * @param {number} [args.maxKeyCount=1000]      Maximum number of keys to return.
	 * @param {string} [args.startApplicationKeyId] First key to return.
	 * @returns {Promise<AxiosResponse>}
	 * @throws {InvalidArgumentError} When the arguments do not pass validation.
	 */
	async listAll(args = {}) {
		const keys = [];
		let startApplicationKeyId = args.startApplicationKeyId || '';

		while (startApplicationKeyId !== null) {
			const response = await this.list({...args, startApplicationKeyId});

			keys.push(...response.data.keys);

			startApplicationKeyId = response.data.nextApplicationKeyId;
		}

		return keys;
	}
}

export default KeyActions;