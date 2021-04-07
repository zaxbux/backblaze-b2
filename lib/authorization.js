/**
 * @file Contains the B2Authorization class
 */

import { B2_KEY_CAPABILITIES } from "./key";

/**
 * @typedef {import("./key").B2KeyCapability} B2KeyCapability
 */

/**
 * @typedef {object} B2KeyAllowed
 * @property {B2KeyCapability[]} capabilities A list of strings, each one naming a capability the key has.
 * @property {string} [bucketId]              When present, access is restricted to one bucket.
 * @property {string} [bucketName]            When present, access is restricted to one bucket.
 * @property {string} [namePrefix]            When present, access is restricted to files whose names start with the prefix.
 */

/**
 * Constructs a new instance of an object that represents B2 API authorization information.
 * 
 * @classdesc 
 * 
 * @param {object} init B2 authorization data to initialize this object with.
 */
class B2Authorization {
	constructor(init) {
		if (init) {
			Object.assign(this, init);
			this.lastUpdate = new Date();
		}
	}

	/**
	 * @returns {Date} The lastUpdate.
	 */
	get lastUpdate() {
		return this._lastUpdate;
	}

	/**
	 * @param {Date} lastUpdate The lastUpdate.
	 */
	set lastUpdate(lastUpdate) {
		this._lastUpdate = lastUpdate;
	}

	/**
	 * @returns {string} The accountId.
	 */
	get accountId() {
		return this._accountId;
	}

	/**
	 * @param {string} accountId The identifier for the account.
	 */
	set accountId(accountId) {
		this._accountId = accountId;
	}

	/**
	 * @returns {string} The authorizationToken.
	 */
	get authorizationToken() {
		return this._authorizationToken;
	}

	/**
	 * @param {string} authorizationToken An authorization token to use with all calls.
	 */
	set authorizationToken(authorizationToken) {
		this._authorizationToken = authorizationToken;
	}

	/**
	 * @returns {B2KeyAllowed} The allowed.
	 */
	get allowed() {
		return this._allowed;
	}

	/**
	 * @param {B2KeyAllowed} allowed The capabilities of this auth token, and any restrictions on using it.
	 */
	set allowed(allowed) {
		this._allowed = allowed;
	}

	/**
	 * @returns {string} The apiUrl.
	 */
	get apiUrl() {
		return this._apiUrl;
	}

	/**
	 * @param {string} apiUrl The base URL to use for all API calls except for uploading and downloading files.
	 */
	set apiUrl(apiUrl) {
		this._apiUrl = apiUrl;
	}

	/**
	 * @returns {string} The downloadUrl.
	 */
	get downloadUrl() {
		return this._downloadUrl;
	}

	/**
	 * @param {string} downloadUrl The base URL to use for downloading files.
	 */
	set downloadUrl(downloadUrl) {
		this._downloadUrl = downloadUrl;
	}

	/**
	 * @returns {number} The recommendedPartSize.
	 */
	get recommendedPartSize() {
		return this._recommendedPartSize;
	}

	/**
	 * @param {number} recommendedPartSize The recommended size for each part of a large file.
	 */
	set recommendedPartSize(recommendedPartSize) {
		this._recommendedPartSize = recommendedPartSize;
	}

	/**
	 * @returns {number} The absoluteMinimumPartSize.
	 */
	get absoluteMinimumPartSize() {
		return this._absoluteMinimumPartSize;
	}

	/**
	 * @param {number} absoluteMinimumPartSize The smallest possible size of a part of a large file (except the last part).
	 */
	set absoluteMinimumPartSize(absoluteMinimumPartSize) {
		this._absoluteMinimumPartSize = absoluteMinimumPartSize;
	}

	/**
	 * @returns {string} The s3ApiUrl.
	 */
	get s3ApiUrl() {
		return this._s3ApiUrl;
	}

	/**
	 * @param {string} s3ApiUrl The base URL to use for S3 compatability.
	 */
	set s3ApiUrl(s3ApiUrl) {
		this._s3ApiUrl = s3ApiUrl;
	}

	/**
	 * Check if this application key has a capability.
	 * 
	 * @param {B2KeyCapability} capability The capability to match.
	 * @returns {boolean}
	 */
	hasCapability(capability) {
		return this.allowed.capabilities.includes(capability);
	}

	/**
	 * Check if this application key has all capabilities in a list.
	 * 
	 * @param {B2KeyCapability[]} capabilities The capabilities to match.
	 * @returns {boolean}
	 */
	hasCapabilities(capabilities) {
		return capabilities.every((capability) => {
			return this.hasCapability(capability);
		});
	}

	/**
	 * Check if this application key has the `listKeys` capability.
	 * 
	 * @returns {boolean}
	 */
	canListKeys() {
		return this.hasCapability(B2_KEY_CAPABILITIES.LIST_KEYS);
	}

	/**
	 * Check if this application key has the `writeKeys` capability.
	 * 
	 * @returns {boolean}
	 */
	canWriteKeys() {
		return this.hasCapability(B2_KEY_CAPABILITIES.WRITE_KEYS);
	}

	/**
	 * Check if this application key has the `deleteKeys` capability.
	 * 
	 * @returns {boolean}
	 */
	canDeleteKeys() {
		return this.hasCapability(B2_KEY_CAPABILITIES.DELETE_KEYS);
	}

	/**
	 * Check if this application key has the `listBuckets` capability.
	 * 
	 * @returns {boolean}
	 */
	canListBuckets() {
		return this.hasCapability(B2_KEY_CAPABILITIES.LIST_BUCKETS);
	}

	/**
	 * Check if this application key has the `listBucketNames` capability.
	 * 
	 * @returns {boolean}
	 */
	canListAllBucketNames() {
		return this.hasCapability(B2_KEY_CAPABILITIES.LIST_ALL_BUCKET_NAMES);
	}

	/**
	 * Check if this application key has the `writeBuckets` capability.
	 * 
	 * @returns {boolean}
	 */
	canWriteBuckets() {
		return this.hasCapability(B2_KEY_CAPABILITIES.WRITE_BUCKETS);
	}

	/**
	 * Check if this application key has the `deleteBuckets` capability.
	 * 
	 * @returns {boolean}
	 */
	canDeleteBuckets() {
		return this.hasCapability(B2_KEY_CAPABILITIES.DELETE_BUCKETS);
	}

	/**
	 * Check if this application key has the `readBucketRetentions` capability.
	 * 
	 * @returns {boolean}
	 */
	canReadBucketRetentions() {
		return this.hasCapability(B2_KEY_CAPABILITIES.READ_BUCKET_RETENTIONS);
	}

	/**
	 * Check if this application key has the `writeBucketRetentions` capability.
	 * 
	 * @returns {boolean}
	 */
	canWriteBucketRetentions() {
		return this.hasCapability(B2_KEY_CAPABILITIES.WRITE_BUCKET_RETENTIONS);
	}

	/**
	 * Check if this application key has the `readBucketEncryption` capability.
	 * 
	 * @returns {boolean}
	 */
	canReadBucketEncryption() {
		return this.hasCapability(B2_KEY_CAPABILITIES.READ_BUCKET_ENCRYPTION);
	}

	/**
	 * Check if this application key has the `writeBucketEncryption` capability.
	 * 
	 * @returns {boolean}
	 */
	canWriteBucketEncryption() {
		return this.hasCapability(B2_KEY_CAPABILITIES.WRITE_BUCKET_ENCRYPTION);
	}

	/**
	 * Check if this application key has the `listFiles` capability.
	 * 
	 * @returns {boolean}
	 */
	canListFiles() {
		return this.hasCapability(B2_KEY_CAPABILITIES.LIST_FILES);
	}

	/**
	 * Check if this application key has the `readFiles` capability.
	 * 
	 * @returns {boolean}
	 */
	canReadFiles() {
		return this.hasCapability(B2_KEY_CAPABILITIES.READ_FILES);
	}

	/**
	 * Check if this application key has the `shareFiles` capability.
	 * 
	 * @returns {boolean}
	 */
	canShareFiles() {
		return this.hasCapability(B2_KEY_CAPABILITIES.SHARE_FILES);
	}

	/**
	 * Check if this application key has the `writeFiles` capability.
	 * 
	 * @returns {boolean}
	 */
	canWriteFiles() {
		return this.hasCapability(B2_KEY_CAPABILITIES.WRITE_FILES);
	}

	/**
	 * Check if this application key has the `deleteFiles` capability.
	 * 
	 * @returns {boolean}
	 */
	canDeleteFiles() {
		return this.hasCapability(B2_KEY_CAPABILITIES.DELETE_FILES);
	}

	/**
	 * Check if this application key has the `readFileRetentions` capability.
	 * 
	 * @returns {boolean}
	 */
	canReadFileRetentions() {
		return this.hasCapability(B2_KEY_CAPABILITIES.READ_FILE_RETENTIONS);
	}

	/**
	 * Check if this application key has the `writeFileRetentions` capability.
	 * 
	 * @returns {boolean}
	 */
	canWriteFileRetentions() {
		return this.hasCapability(B2_KEY_CAPABILITIES.WRITE_FILE_RETENTIONS);
	}

	/**
	 * Check if this application key has the `bypassGovernance` capability.
	 * 
	 * @returns {boolean}
	 */
	canBypassGovernance() {
		return this.hasCapability(B2_KEY_CAPABILITIES.BYPASS_GOVERNANCE);
	}

	/**
	 * Check if this authorization is restricted to a specific bucket.
	 * 
	 * @param {string} bucket The unique name or ID of a bucket.
	 * @returns {boolean}
	 */
	hasBucketRestriction(bucket) {
		if (bucket !== undefined) {
			return this.allowed.bucketId === bucket || this.allowed.bucketName === bucket;
		}

		return typeof this.allowed.bucketId === 'string' && typeof this.allowed.bucketName === 'string';
	}

	/**
	 * Updates this object with new authorization data.
	 * 
	 * @param {object} authorization The new authorization data.
	 * 
	 * @returns {B2Authorization}
	 */
	update(authorization) {
		Object.assign(this, authorization);

		return this;
	}
}

export default B2Authorization;