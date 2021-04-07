import B2Object from './b2-object';
import { HTTP_STATUS_CODES } from './constants';
import { InvalidArgumentError, NotFoundError } from './errors';

/**
 * See {@link https://www.backblaze.com/b2/docs/buckets.html#accessControls}.
 * 
 * @typedef {"allPublic" | "allPrivate" | "snapshot"} B2BucketType
 * @enum {string}
 */
export const BUCKET_TYPES = {
	ALL_PUBLIC:  'allPublic',
	ALL_PRIVATE: 'allPrivate',
	SNAPSHOT:    'snapshot',
};

/**
 * @typedef {import('./file').B2SSEConfig} B2SSEConfig
 */

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
	 * @returns {string} The account that the bucket is in.
	 */
	get accountId() {
		return this._accountId;
	}

	/**
	 * @param {string} accountId The account that the bucket is in.
	 */
	set accountId(accountId) {
		this._accountId = accountId;
	}

	/**
	 * @returns {string} The unique ID of the bucket.
	 */
	get bucketId() {
		return this._bucketId;
	}

	/**
	 * @param {string} bucketId The unique ID of the bucket.
	 */
	set bucketId(bucketId) {
		this._bucketId = bucketId;
	}

	/**
	 * @returns {string} The unique name of the bucket.
	 */
	get bucketName() {
		return this._bucketName;
	}

	/**
	 * @param {string} bucketName The unique name of the bucket.
	 */
	set bucketName(bucketName) {
		this._bucketName = bucketName;
	}

	/**
	 * One of: `allPublic`, `allPrivate`, `snapshot`, or other values added in the future.
	 * * `allPublic` - means that anybody can download the files is the bucket.
	 * * `allPrivate` - means that you need an authorization token to download them.
	 * * `snapshot` - means that it's a private bucket containing snapshots created on the B2 web site.
	 * 
	 * @returns {B2BucketType}
	 */
	get bucketType() {
		return this._bucketType;
	}

	/**
	 * @param {B2BucketType} bucketType The type of the bucket.
	 */
	set bucketType(bucketType) {
		this._bucketType = bucketType;
	}

	/**
	 * @returns {Object.<string, string>} The user data stored with this bucket.
	 */
	get bucketInfo() {
		return this._bucketInfo;
	}

	/**
	 * @param {Object.<string, string>} bucketInfo The user data stored with this bucket.
	 */
	set bucketInfo(bucketInfo) {
		this._bucketInfo = bucketInfo;
	}

	/**
	 * @returns {CorsRule[]} The CORS rules for this bucket.
	 */
	get corsRules() {
		return this._corsRules;
	}

	/**
	 * @param {CorsRule[]} corsRules The CORS rules for this bucket.
	 */
	set corsRules(corsRules) {
		this._corsRules = corsRules;
	}

	/**
	 * @returns {LifecycleRule[]} The list of lifecycle rules for this bucket.
	 */
	get lifecycleRules() {
		return this._lifecycleRules;
	}

	/**
	 * @param {LifecycleRule[]} lifecycleRules The list of lifecycle rules for this bucket.
	 */
	set lifecycleRules(lifecycleRules) {
		this._lifecycleRules = lifecycleRules;
	}

	/**
	 * @returns {B2SSEConfig} The default bucket Server-Side Encryption settings for new files uploaded to this bucket.
	 */
	get defaultServerSideEncryption() {
		return this._defaultServerSideEncryption;
	}

	/**
	 * @param {B2SSEConfig} defaultServerSideEncryption The default bucket Server-Side Encryption settings for new files uploaded to this bucket.
	 */
	set defaultServerSideEncryption(defaultServerSideEncryption) {
		this._defaultServerSideEncryption = defaultServerSideEncryption;
	}

	/**
	 * A counter that is updated every time the bucket is modified, and can be used with the ifRevisionIs parameter to b2_update_bucket to prevent colliding, simultaneous updates.
	 * 
	 * @returns {number}
	 */
	get revision() {
		return this._revision;
	}

	/**
	 * @param {number} revision 
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
	 * @returns {Promise<Bucket>} This object with the bucketId property set.
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
		}

		return this;
	}

	/**
	 * Deletes this bucket.
	 * 
	 * @returns {Promise<boolean>} True if the bucket was successfully deleted.
	 */
	async delete() {
		this.checkClient();

		const response = await this._b2.bucket.delete({
			bucketId: this.bucketId,
		});

		return response.status === HTTP_STATUS_CODES.OK;
	}

	/**
	 * @param {object}        args                               Method arguments.
	 * @param {B2BucketType}  [args.bucketType]                  Update bucket type.
	 * @param {object}        [args.bucketInfo]                  Update user data.
	 * @param {CorsRule}      [args.corsRules]                   Update CORS rules.
	 * @param {LifecycleRule} [args.lifecycleRules]              Update lifecycle rules.
	 * @param {B2SSEConfig}   [args.defaultServerSideEncryption] Update the default SSE config.
	 * @param {number}        [args.ifRevisionIs]                Only update if the stored revision matches this value.
	 * @returns {Promise<boolean>}
	 * @throws {InvalidArgumentError} When the arguments do not pass validation.
	 */
	async update(args) {
		if (!args) {
			throw new InvalidArgumentError('No parameters were provided');
		}

		this.checkClient();

		const response = await this._b2.bucket.update({
			...args,
			ifRevisionIs: args.ifRevisionIs || this.revision,
			bucketId:     this.bucketId,
		});

		return response.status === HTTP_STATUS_CODES.OK;
	}

	/**
	 * Gets the URL and authorization token to use for uploading files to this bucket.
	 * 
	 * @returns {Promise<BucketUploadInformation>}
	 */
	async getUploadUrl() {
		this.checkClient();

		const response = await this._b2.bucket.getUploadUrl({
			bucketId: this.bucketId,
		});

		if (response.status === HTTP_STATUS_CODES.OK) {
			return response.data;
		}
	}

	/**
	 * Lists the names of files in this bucket.
	 * 
	 * @param {object}  [args]           Method arguments.
	 * @param {string}  [args.prefix]    Files returned will be limited to those with the given prefix.
	 * @param {string}  [args.delimiter] Files returned will be limited to those within the top folder, or any one subfolder.
	 * @returns {Promise<File[]>}
	 */
	async listFileNames(args = {}) {
		this.checkClient();

		// @ts-ignore
		return (await this._b2.file.listAllNames({
			...args,
			bucketId: this.bucketId,
		})).map((file) => {
			file.bucket = this; // Bind this bucket to each file.
		}, this);
	}

	/**
	 * Lists the versions of files in this bucket.
	 * 
	 * @param {object}  [args]           Method arguments.
	 * @param {string}  [args.prefix]    Files returned will be limited to those with the given prefix.
	 * @param {string}  [args.delimiter] Files returned will be limited to those within the top folder, or any one subfolder.
	 * @returns {Promise<File[]>}
	 */
	async listFileVersions(args = {}) {
		this.checkClient();

		
		return (await this._b2.file.listVersions({
			...args,
			bucketId: this.bucketId,
		// @ts-ignore
		})).map((file) => {
			file.bucket = this; // Bind this bucket to each file.
		}, this);
	}

	/**
	 * Check if a file exists in a bucket.
	 * 
	 * @param {object} args          Method arguments.
	 * @param {string} args.fileName Check existance of this file name.
	 * @returns {Promise<boolean>}
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
		return this._bucketType === BUCKET_TYPES.SNAPSHOT;
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