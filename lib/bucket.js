import B2Object from './b2-object';
import { HTTP_STATUS_CODES } from './constants';
import { InvalidArgumentError, NotFoundError } from './errors';

/**
 * See {@link https://www.backblaze.com/b2/docs/buckets.html#accessControls}.
 * 
 * @typedef {"allPublic" | "allPrivate" | "snapshot"} B2BucketType
 * @enum {B2BucketType}
 */
export const BUCKET_TYPES = {
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
 * @typedef {object} BucketUploadInformation
 * @property {string} bucketId           The unique ID of the bucket.
 * @property {string} uploadUrl          The URL that can be used to upload files to this bucket.
 * @property {string} authorizationToken The authorizationToken that must be used when uploading files to this bucket. This token is valid for 24 hours or until the uploadUrl endpoint rejects an upload.
 */

/**
 * @augments B2Object
 */
class Bucket extends B2Object {

	/**
	 * @returns {string}
	 */
	get accountId() {
		return this._accountId;
	}

	/**
	 * @param {string} accountId 
	 */
	set accountId(accountId) {
		this._accountId = accountId;
	}

	/**
	 * @returns {string}
	 */
	get bucketId() {
		return this._bucketId;
	}

	/**
	 * @param {string} bucketId 
	 */
	set bucketId(bucketId) {
		this._bucketId = bucketId;
	}

	/**
	 * @returns {string}
	 */
	get bucketName() {
		return this._bucketName;
	}

	/**
	 * @param {string} bucketName 
	 */
	set bucketName(bucketName) {
		this._bucketName = bucketName;
	}

	/**
	 * @returns {B2BucketType}
	 */
	get bucketType() {
		return this._bucketType;
	}

	/**
	 * @param {B2BucketType} bucketType 
	 */
	set bucketType(bucketType) {
		this._bucketType = bucketType;
	}

	/**
	 * @returns {object.<string, string>}
	 */
	get bucketInfo() {
		return this._bucketInfo;
	}

	/**
	 * @param {object.<string, string>} bucketInfo 
	 */
	set bucketInfo(bucketInfo) {
		this._bucketInfo = bucketInfo;
	}

	/**
	 * @returns {CorsRule[]}
	 */
	get corsRules() {
		return this._corsRules;
	}

	/**
	 * @param {CorsRule[]} corsRules 
	 */
	set corsRules(corsRules) {
		this._corsRules = corsRules;
	}

	/**
	 * @returns {LifecycleRule[]}
	 */
	get lifecycleRules() {
		return this._lifecycleRules;
	}

	/**
	 * @param {LifecycleRule[]} lifecycleRules 
	 */
	set lifecycleRules(lifecycleRules) {
		this._lifecycleRules = lifecycleRules;
	}

	/**
	 * @returns {string}
	 */
	get revision() {
		return this._revision;
	}

	/**
	 * @param {string} revision 
	 */
	set revision(revision) {
		this._revision = revision;
	}

	/**
	 * @returns {string}
	 */
	get options() {
		return this._options;
	}

	/**
	 * @param {string} options 
	 */
	set options(options) {
		this._options = options;
	}

	/**
	 * Creates this bucket.
	 * 
	 * @returns {Bucket|AxiosResponse} This object with the bucketId property set.
	 */
	async create() {
		this.checkClient();

		const response = await this._b2.bucket.create({
			bucketName:                  this.bucketName,
			bucketType:                  this.bucketType,
			bucketInfo:                  this.bucketInfo                  || undefined,
			corsRules:                   this.corsRules                   || undefined,
			lifecycleRules:              this.lifecycleRules              || undefined,
			defaultServerSideEncryption: this.defaultServerSideEncryption || undefined,
		});

		// Set instance's bucketId, revision, and options
		if (response.status === HTTP_STATUS_CODES.OK) {
			this._bucketId = response.data.bucketId;
			this._revision = response.data.revision;
			this._options  = response.data.options;

			return this;
		}

		return response;
	}

	/**
	 * Deletes this bucket.
	 * 
	 * @returns {boolean|AxiosResponse} True if the bucket was successfully deleted.
	 */
	async delete() {
		this.checkClient();

		const response = await this._b2.bucket.delete({
			bucketId: this.bucketId,
		});

		if (response.data.bucketId === this.bucketId) {
			return true;
		}

		return response;
	}

	/**
	 * @param {object}        args                               Method arguments.
	 * @param {B2BucketType}  [args.bucketType]                  Update bucket type.
	 * @param {object}        [args.bucketInfo]                  Update user data.
	 * @param {CorsRule}      [args.corsRules]                   Update CORS rules.
	 * @param {LifecycleRule} [args.lifecycleRules]              Update lifecycle rules.
	 * @param {B2SSEConfig}   [args.defaultServerSideEncryption] Update the default SSE config.
	 * @param {number}        [args.ifRevisionIs]                Only update if the stored revision matches this value.
	 * @returns {boolean|AxiosResponse}
	 * @throws {InvalidArgumentError}
	 */
	async update(args) {
		if (!args) {
			throw new InvalidArgumentError('No parameters were provided');
		}

		this.checkClient();

		const response = this._b2.bucket.update({
			...args,
			ifRevisionIs: args.ifRevisionIs || this.revision,
			bucketId:     this.bucketId,
		});

		if (response.status === HTTP_STATUS_CODES.OK) {
			return true;
		}

		return response;
	}

	/**
	 * Gets the URL and authorization token to use for uploading files to this bucket.
	 * 
	 * @returns {BucketUploadInformation|AxiosResponse}
	 */
	async getUploadUrl() {
		this.checkClient();

		const response = await this._b2.bucket.getUploadUrl({
			bucketId: this.bucketId,
		});

		if (response.status === HTTP_STATUS_CODES.OK) {
			return response.data;
		}

		return response;
	}

	/**
	 * Lists the names of files in this bucket.
	 * 
	 * @param {object}  [args]           Method arguments.
	 * @param {string}  [args.prefix]    Files returned will be limited to those with the given prefix.
	 * @param {string}  [args.delimiter] Files returned will be limited to those within the top folder, or any one subfolder.
	 * @returns {File[]}
	 */
	async listFileNames(args = {}) {
		this.checkClient();

		return this._b2.file.listAllNames({
			...args,
			bucketId: this.bucketId,
		}).map((file) => {
			file.bucket = this; // Bind this bucket to each file.
		}, this);
	}

	/**
	 * Lists the versions of files in this bucket.
	 * 
	 * @param {object}  [args]           Method arguments.
	 * @param {string}  [args.prefix]    Files returned will be limited to those with the given prefix.
	 * @param {string}  [args.delimiter] Files returned will be limited to those within the top folder, or any one subfolder.
	 * @returns {File[]}
	 */
	async listFileVersions(args = {}) {
		this.checkClient();

		return this._b2.file.listVersions({
			...args,
			bucketId: this.bucketId,
		}).map((file) => {
			file.bucket = this; // Bind this bucket to each file.
		}, this);
	}

	/**
	 * Check if a file exists in a bucket.
	 * 
	 * @param {object} args          Method arguments.
	 * @param {string} args.fileName Check existance of this file name.
	 * @returns {boolean}
	 */
	async fileExists(args) {
		this.checkClient();

		if (args.fileName) {
			try {
				const response = await this._b2.file.downloadByName({
					bucketName: this.bucketName,
					fileName: args.fileName,
					axios: {
						headersOnly: true,
					}
				});

				return response.status === HTTP_STATUS_CODES.OK;
			} catch (error) {
				if (error instanceof NotFoundError) {
					return false;
				}
			}
		}

		return false;
	}

	/**
	 * @returns {boolean}
	 */
	isSnapshot() {
		return this._bucketType === BUCKET_TYPES.SNAPHOT;
	}

	/**
	 * @returns {boolean}
	 */
	isPrivate() {
		return this._bucketType === BUCKET_TYPES.ALL_PRIVATE;
	}

	/**
	 * @returns {boolean}
	 */
	isPublic() {
		return this._bucketType === BUCKET_TYPES.ALL_PUBLIC;
	}
}

export default Bucket;