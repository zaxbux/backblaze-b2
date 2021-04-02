/**
 * @file Defines KeyActions class.
 */

import B2Action from './base';

/**
 * @readonly
 * 
 * @typedef {string} B2KeyCapability
 * @enum {B2KeyCapability}
 */
export const CAPABILITIES = {
	LIST_KEYS: 'listKeys',
	WRITE_KEYS: 'writeKeys',
	DELETE_KEYS: 'deleteKeys',

	LIST_BUCKETS: 'listBuckets',
	WRITE_BUCKETS: 'writeBuckets',
	DELETE_BUCKETS: 'deleteBuckets',

	LIST_FILES: 'listFiles',
	READ_FILES: 'readFiles',
	SHARE_FILES: 'shareFiles',
	WRITE_FILES: 'writeFiles',
	DELETE_FILES: 'deleteFiles',
};

/**
 * Methods for managing B2 application keys.
 * 
 * See {@link https://www.backblaze.com/b2/docs/application_keys.html}.
 * 
 * @class
 * @public
 */
class KeyActions extends B2Action {

	/**
	 * Creates a new application key.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_create_key.html}.
	 * 
	 * @async
	 * @param {object}            args                          Method arguments.
	 * @param {B2KeyCapability[]} args.capabilities             Capabilities the new key should have.
	 * @param {string}            args.keyName                  Name for this key.
	 * @param {number}            [args.validDurationInSeconds] When the key will expire.
	 * @param {string}            [args.bucketId]               Restricts access to one bucket.
	 * @param {string}            [args.namePrefix]             Restricts access to files whose names start with the prefix.
	 * @returns {Promise<AxiosResponse>}
	 */
	async create(args) {
		return await this.b2.client.post('/b2_create_key', {
			data: {
				accountId:              this.b2.authorization.accountId,
				capabilities:           args.capabilities,
				keyName:                args.keyName,
				validDurationInSeconds: args.validDurationInSeconds,
				bucketId:               args.bucketId,
				namePrefix:             args.namePrefix,
			}
		});
	}

	/**
	 * Deletes the application key specified.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_delete_key.html}.
	 * 
	 * @async
	 * @param {object} args                  Method arguments.
	 * @param {string} args.applicationKeyId The key to delete.
	 * @returns {Promise<AxiosResponse>}
	 */
	async delete(args) {
		return await this.b2.client.post('/b2_delete_key', {
			data: {
				applicationKeyId: args.applicationKeyId,
			}
		});
	}

	/**
	 * Lists application keys associated with an account.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_list_keys.html}.
	 * 
	 * @async
	 * @param {object} [args]                       Method arguments.
	 * @param {number} [args.maxKeyCount]           Maximum number of keys to return.
	 * @param {string} [args.startApplicationKeyId] First key to return.
	 * @returns {Promise<AxiosResponse>}
	 */
	async list(args = {}) {
		return await this.b2.client.post('/b2_list_keys', {
			data: {
				accountId: this.b2.authorization.accountId,
				maxKeyCount: args.maxKeyCount,
				startApplicationKeyId: args.startApplicationKeyId,
			},
		});
	}
}

export default KeyActions;