/**
 * @file Keys actions.
 */

import { BucketNotFoundError, InvalidArgumentError } from '../errors';
import Bucket, { BUCKET_TYPES } from '../bucket';
import B2Action from './base';

/**
 * @namespace Actions
 * @class
 * @classdesc Methods for managing B2 buckets.
 * 
 * See {@link https://www.backblaze.com/b2/docs/buckets.html}.
 * 
 * @augments B2Action
 */
class BucketActions extends B2Action {
	/**
	 * Creates a new B2 bucket.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_create_bucket.html}.
	 * 
	 * @b2TransactionClass A
	 * @param {object}           args                               Method arguments.
	 * @param {string}           args.bucketName                    Unique name for the bucket.
	 * @param {BucketType}       [args.bucketType=allPrivate]       Type of bucket to create.
	 * @param {string[]}         [args.bucketInfo]                  Optional metadata to store with the bucket.
	 * @param {CorsRule[]}       [args.corsRules]                   Optional CORS rules.
	 * @param {LifecycleRule[]}  [args.lifecycleRules]              Optional B2 lifecycle rules.
	 * @param {object}           [args.defaultServerSideEncryption] Optional server-side encryption configuration.
	 * @returns {Promise<AxiosResponse>}
	 * @throws {InvalidArgumentError}
	 */
	async create(args) {
		if (!args || !args.bucketName) {
			throw new InvalidArgumentError('The `bucketName` parameter is required');
		}

		return await this._b2.client.post('/b2_create_bucket', {
			accountId:                   this._b2.authorization.accountId,
			bucketName:                  args.bucketName,
			bucketType:                  args.bucketType                  || BUCKET_TYPES.ALL_PRIVATE,
			bucketInfo:                  args.bucketInfo                  || null,
			corsRules:                   args.corsRules                   || null,
			lifecycleRules:              args.lifecycleRules              || null,
			defaultServerSideEncryption: args.defaultServerSideEncryption || null
		}, {
			transformResponse: (data) => this.transformResponse(data, (data) => {
				return new Bucket(data, this._b2);
			}),
		});
	}

	/**
	 * Deletes a B2 bucket.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_delete_bucket.html}.
	 * 
	 * @b2TransactionClass A
	 * @param {object} args          Method arguments.
	 * @param {string} args.bucketId ID of the bucket to delete.
	 * @returns {Promise<AxiosResponse>}
	 * @throws {InvalidArgumentError}
	 */
	async delete(args) {
		if (!args || !args.bucketId) {
			throw new InvalidArgumentError('The `bucketId` parameter is required');
		}

		return await this._b2.client.post('/b2_delete_bucket', {
			accountId: this._b2.authorization.accountId,
			bucketId: args.bucketId,
		});
	}

	/**
	 * @typedef {Promise<AxiosResponse>} B2ResponseListBuckets
	 * @property {object}   data         B2 API response.
	 * @property {Bucket[]} data.buckets Array of B2 buckets.
	 */

	/**
	 * Lists the B2 buckets associated with an account.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_list_buckets.html}.
	 * 
	 * @b2TransactionClass C
	 * @param {object}       [args]             Method arguments.
	 * @param {string}       [args.bucketId]    Only include this bucket ID, if it exists in the account.
	 * @param {string}       [args.bucketName]  Only include this bucket name, if it exists in the account.
	 * @param {BucketType[]} [args.bucketTypes] Filter for bucket types.
	 * @returns {B2ResponseListBuckets}
	 */
	async list(args = {}) {
		return await this._b2.client.post('/b2_list_buckets', {
			accountId:   this._b2.authorization.accountId,
			bucketId:    args.bucketId    || null,
			bucketName:  args.bucketName  || null,
			bucketTypes: args.bucketTypes || null,
		}, {
			transformResponse: (data) => this.transformResponse(data, (data) => {
				if (data.buckets) {
					data.buckets = data.buckets.map((bucket) => {
						return new Bucket(bucket, this._b2);
					}, this);
				}

				return data;
			}),
		});
	}

	/**
	 * Gets information on a B2 bucket.
	 * 
	 * @b2TransactionClass C
	 * @param {object} args              Method arguments.
	 * @param {string} [args.bucketId]   The ID of the bucket.
	 * @param {string} [args.bucketName] The name of the bucket.
	 * @returns {Bucket?}
	 * @throws {InvalidArgumentError}
	 */
	async get(args) {
		if (!args || !args.bucketId && !args.bucketName) {
			throw new InvalidArgumentError('Either the `bucketId` or `bucketName` parameter is required');
		}

		if (args.bucketId && args.bucketName) {
			throw new InvalidArgumentError('Cannot specify both `bucketId` and `bucketName` parameters');
		}

		const buckets = await this.list(args).data.buckets;

		if (buckets.length > 0) {
			return response.data.buckets[0];
		}

		throw new BucketNotFoundError();
	}

	/**
	 * Modifies the settings of an existing bucket.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_update_bucket.html}.
	 * 
	 * @b2TransactionClass C
	 * @param {object}        args                               Method arguments.
	 * @param {string}        args.bucketId                      The ID of the bucket.
	 * @param {BucketType}    [args.bucketType]                  Update bucket type.
	 * @param {object}        [args.bucketInfo]                  Update user data.
	 * @param {CorsRule}      [args.corsRules]                   Update CORS rules.
	 * @param {LifecycleRule} [args.lifecycleRules]              Update lifecycle rules.
	 * @param {B2SSEConfig}   [args.defaultServerSideEncryption] Update the default SSE config.
	 * @param {number}        [args.ifRevisionIs]                Only update if the stored revision matches this value.
	 * @returns {Promise<AxiosResponse>}
	 * @throws {InvalidArgumentError}
	 */
	async update(args) {
		if (!args || !args.bucketId) {
			throw new InvalidArgumentError('The `bucketId` parameter is required');
		}

		return await this._b2.client.post('/b2_update_bucket', {
			data: {
				...args,
				accountId: this._b2.authorization.accountId,
			},
		});
	}

	/**
	 * Gets a URL to use for uploading files to a bucket.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_get_upload_url.html}.
	 * 
	 * @async
	 * @param {object} args          Method arguments.
	 * @param {string} args.bucketId The ID of the bucket.
	 * @returns {Promise<AxiosResponse>}
	 * @throws {InvalidArgumentError}
	 */
	async getUploadUrl(args) {
		if (!args || !args.bucketId) {
			throw new InvalidArgumentError('The `bucketId` parameter is required');
		}

		return await this._b2.client.post('/b2_get_upload_url', {
			bucketId: args.bucketId
		});
	}
}

export default BucketActions;