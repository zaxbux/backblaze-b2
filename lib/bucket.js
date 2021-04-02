/**
 * @file Defines BucketActions class.
 */

import { InvalidArgumentError } from '../errors';
import B2Action from './base';

/**
 * See {@link https://www.backblaze.com/b2/docs/buckets.html#accessControls}.
 * 
 * @typedef {"allPublic" | "allPrivate" | "snapshot"} BucketType
 */
export const TYPES = {
	ALL_PUBLIC:  'allPublic',
	ALL_PRIVATE: 'allPrivate',
	SNAPSHOT:    'snapshot',
};

/**
 * See {@link https://www.backblaze.com/b2/docs/cors_rules.html}.
 * 
 * @typedef {object} CorsRule
 * @property {string}   corsRuleName      Unique name for humans to recognize the rule in a user interface.
 * @property {number}   maxAgeSeconds     Maximum number of seconds that a browser may cache the response to a preflight request.
 * @property {string[]} allowedOrigins    List specifying which origins the rule covers.
 * @property {string[]} allowedOperations List specifying which operations the rule allows.
 * @property {string[]} [allowedHeaders]  Headers that are allowed in a CORS pre-flight request's `Access-Control-Request-Headers` header.
 * @property {string[]} [exposeHeaders]   Headers that may be exposed to an application inside the client.
 */

/**
 * See {@link https://www.backblaze.com/b2/docs/lifecycle_rules.html}.
 * 
 * @typedef {object} LifecycleRule
 * @property {string} daysFromHidingToDeleting  How long to keep file versions that are not the current version.
 * @property {string} daysFromUploadingToHiding How long to automatically hide files.
 * @property {string} fileNamePrefix            Any file whose name starts with the prefix is subject to the rule.
 */

/**
 * @typedef {object} Bucket
 * @property {string}          accountId                   Account that the bucket is in.
 * @property {string}          bucketId                    Unique ID of the bucket.
 * @property {string}          bucketName                  Unique name of the bucket.
 * @property {BucketType}      bucketType                  Type of the bucket.
 * @property {object}          bucketInfo                  User data stored with this bucket.
 * @property {CorsRule[]}      corsRules                   CORS rules for this bucket.
 * @property {object}          defaultServerSideEncryption Default server-side encryption config for new files.
 * @property {LifecycleRule[]} lifecycleRules              Lifecycle rules for this bucket.
 * @property {string}          revision                    Counter that is updated every time the bucket is modified.
 * @property {string?}         options                     When set to `s3`, this bucket can be accessed through the S3 Compatible API.
 */

/**
 * @typedef {object} BucketListResponse
 * @property {Bucket[]} buckets An array of Bucket objects.
 */

/**
 * Methods for managing B2 buckets.
 * 
 * See {@link https://www.backblaze.com/b2/docs/buckets.html}.
 * 
 * @class
 * @public
 */
class BucketActions extends B2Action {
	/**
	 * Creates a new B2 bucket.
	 * See {@link https://www.backblaze.com/b2/docs/b2_create_bucket.html}.
	 * 
	 * @async
	 * @param {object}           args                               Method arguments.
	 * @param {string}           args.bucketName                    Unique name for the bucket.
	 * @param {BucketType}       args.bucketType                    Type of bucket to create.
	 * @param {string[]}         [args.bucketInfo]                  Optional metadata to store with the bucket.
	 * @param {CorsRule[]}       [args.corsRules]                   Optional CORS rules.
	 * @param {LifecycleRule[]}  [args.lifecycleRules]              Optional B2 lifecycle rules.
	 * @param {object}           [args.defaultServerSideEncryption] Optional server-side encryption configuration.
	 * @returns {Promise<AxiosResponse>}
	 */
	async create(args) {
		return await this.b2.client.post({
			url: '/b2_create_bucket',
			data: {
				accountId: this.b2.authorization.accountId,
				bucketName: args.bucketName,
				bucketType: args.bucketType,
			},
		});
	}

	/**
	 * Deletes a B2 bucket.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_delete_bucket.html}.
	 * 
	 * @async
	 * @param {object} args          Method arguments.
	 * @param {string} args.bucketId ID of the bucket to delete.
	 * @returns {Promise<AxiosResponse>}
	 */
	async delete(args) {
		return await this.b2.client.post({
			url: '/b2_delete_bucket',
			data: {
				accountId: this.b2.authorization.accountId,
				bucketId: args.bucketId,
			},
		});
	}

	/**
	 * Lists the B2 buckets associated with an account.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_list_buckets.html}.
	 * 
	 * @async
	 * @param {object}       [args]              Method arguments.
	 * @param {string}       [args.bucketId]     Only include this bucket ID, if it exists in the account.
	 * @param {string}       [args.bucketName]   Only include this bucket name, if it exists in the account.
	 * @param {BucketType[]} [args.bucketTypes] Filter for bucket types.
	 * @returns {Promise<AxiosResponse>}
	 */
	async list(args = {}) {
		return await this.b2.client.post('/b2_list_buckets', {
			accountId: this.b2.authorization.accountId,
			bucketId: args.bucketId,
			bucketName: args.bucketName,
			bucketTypes: args.bucketTypes,
		});
	}

	/**
	 * Gets information on a B2 bucket.
	 * 
	 * @async
	 * @param {object} args              Method arguments.
	 * @param {string} [args.bucketId]   The ID of the bucket.
	 * @param {string} [args.bucketName] The name of the bucket.
	 * @returns {Bucket?}
	 * @throws {InvalidArgumentError}
	 */
	async get(args) {
		// only one of these can/should be used at a time
		if (args.bucketId && args.bucketName) {
			throw new InvalidArgumentError('Cannot specify both bucketId and bucketName');
		}

		const response = await this.list(args);

		if (response.data.buckets.length > 0) {
			return response.data.buckets[0];
		}

		return null;
	}

	/**
	 * Modifies the settings of an existing bucket.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_update_bucket.html}.
	 * 
	 * @async
	 * @param {object}     args              Method arguments.
	 * @param {string}     args.bucketId     The ID of the bucket.
	 * @param {BucketType} [args.bucketType] Update bucket type.
	 * @param {object}     [args.bucketInfo] Update user data.
	 * @param {CorsRule}   [args.corsRules]  Update CORS rules.
	 * @returns {Promise<AxiosResponse>}
	 */
	async update(args) {
		return await this.b2.client.post('/b2_update_bucket', {
			data: {
				...args,
				accountId: this.b2.authorization.accountId,
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
	 */
	async getUploadUrl(args) {
		return await this.b2.client.post('/b2_get_upload_url', {
			data: {
				bucketId: args.bucketId
			},
		});
	}
}

export default BucketActions;