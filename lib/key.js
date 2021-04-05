import B2Object from './b2-object';
import { HTTP_STATUS_CODES } from './constants';

/**
 * See {@link https://www.backblaze.com/b2/docs/application_keys.html#capabilities}.
 * 
 * @typedef {string} B2KeyCapability
 * @enum {B2KeyCapability}
 */
export const CAPABILITIES = {
	LIST_KEYS:   'listKeys',
	WRITE_KEYS:  'writeKeys',
	DELETE_KEYS: 'deleteKeys',

	LIST_BUCKETS:            'listBuckets',
	LIST_ALL_BUCKET_NAMES:   'listAllBucketNames',
	WRITE_BUCKETS:           'writeBuckets',
	DELETE_BUCKETS:          'deleteBuckets',
	READ_BUCKET_RETENTIONS:  'readBucketRetentions',
	WRITE_BUCKET_RETENTIONS: 'writeBucketRetentions',
	READ_BUCKET_ENCRYPTION:  'readBucketEncryption',
	WRITE_BUCKET_ENCRYPTION: 'writeBucketEncryption',

	LIST_FILES:            'listFiles',
	READ_FILES:            'readFiles',
	SHARE_FILES:           'shareFiles',
	WRITE_FILES:           'writeFiles',
	DELETE_FILES:          'deleteFiles',
	READ_FILE_RETENTIONS:  'readFileRetentions',
	WRITE_FILE_RETENTIONS: 'writeFileRetentions',
	BYPASS_GOVERNANCE:     'bypassGovernance',
};

/**
 * @typedef {object} B2KeyInit
 * @property {string}             keyName                The keyName.
 * @property {string}             applicationKeyId       The applicationKeyId.
 * @property {string}             accountId              The accountId.
 * @property {B2KeyCapability[]}  capabilities           The capabilities.
 * @property {number}             validDurationInSeconds The validDurationInSeconds.
 * @property {number|string|Date} expirationTimestamp    The expirationTimestamp.
 * @property {string}             namePrefix             The namePrefix.
 * @property {string}             options                The options.
 */

/**
 * @augments B2Object
 * @param {B2KeyInit} [init] Data to initialize a Key instance with.
 * @param {B2}        [b2]   Instance of the B2 API client.
 */
class Key extends B2Object {

	constructor(init = {}, b2 = null) {
		const applicationKey = init.applicationKey;
		delete init.applicationKey;

		super(init, b2);

		this._applicationKey = applicationKey;
	}

	/**
	 * @returns {string}
	 */
	get keyName() {
		return this._keyName;
	}

	/**
	 * @param {string} keyName 
	 */
	set keyName(keyName) {
		this._keyName = keyName;
	}

	/**
	 * @returns {string}
	 */
	get applicationKeyId() {
		return this._applicationKeyId;
	}

	/**
	 * @param {string} applicationKeyId 
	 */
	set applicationKeyId(applicationKeyId) {
		this._applicationKeyId = applicationKeyId;

	}

	/**
	 * @readonly
	 * @returns {string}
	 */
	get applicationKey() {
		return this._applicationKey;
	}

	/**
	 * @throws {TypeError}
	 */
	/*set applicationKey(applicationKey) {
		throw new TypeError('Cannot assign to read only property \'applicationKey\' of object #<Key>');
	}*/

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
	 * @returns {B2KeyCapability[]}
	 */
	get capabilities() {
		return this._capabilities;
	}

	/**
	 * @param {Array<B2KeyCapability>} capabilities
	 */
	set capabilities(capabilities) {
		this._capabilities = capabilities;
	}

	/**
	 * Gets the expiration timestamp of the key. If only the valid duration is available, the current date plus the valid duration is returned.
	 * 
	 * @returns {Date}
	 */
	get expirationTimestamp() {
		if (!this._expirationTimestamp && this._validDurationInSeconds) {
			const now = new Date();

			return now.setMilliseconds(now.getTime() + this._validDurationInSeconds);
		}

		return this._expirationTimestamp;
	}

	/**
	 * @param {number|string|Date} expirationTimestamp
	 */
	set expirationTimestamp(expirationTimestamp) {
		this._expirationTimestamp = expirationTimestamp instanceof Date ? expirationTimestamp : new Date(expirationTimestamp);

	}

	/**
	 * Gets the valid duration of this key in seconds. If only the expiration timestamp is available, the difference is returned.
	 * 
	 * @returns {number}
	 */
	get validDurationInSeconds() {
		if (!this._validDurationInSeconds && this._expirationTimestamp) {
			const now = new Date();
			const difference = this._expirationTimestamp.getSeconds() - now.getSeconds();
			return difference > 0 ? difference : 0;
		}

		return this._validDurationInSeconds;
	}

	/**
	 * @param {number} validDurationInSeconds
	 */
	set validDurationInSeconds(validDurationInSeconds) {
		this._validDurationInSeconds = validDurationInSeconds;

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
	get namePrefix() {
		return this._namePrefix;
	}

	/**
	 * @param {string} namePrefix
	 */
	set namePrefix(namePrefix) {
		this._namePrefix = namePrefix;
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
	 * Creates this key and store the `applicationKey`.
	 * 
	 * @returns {Key|AxiosResponse} This object with the applicationKey property set.
	 */
	async create() {
		this.checkClient();

		const response = await this._b2.key.create({
			keyName:                this.keyName,
			capabilities:           this.capabilities,
			validDurationInSeconds: this.validDurationInSeconds || undefined,
			bucketId:               this.bucketId               || undefined,
			namePrefix:             this.namePrefix             || undefined,
		});

		// Set instance's applicationKey
		if (response.status === HTTP_STATUS_CODES.OK) {
			this._applicationKey = response.data.applicationKey;

			return this;
		}

		return response;
	}

	/**
	 * Deletes this key.
	 * 
	 * @returns {boolean|AxiosResponse} True if this key was successfully deleted.
	 */
	async delete() {
		this.checkClient();

		const response = await this._b2.key.delete({
			applicationKeyId: this.applicationKeyId,
		});

		if (response.status === HTTP_STATUS_CODES.OK) {
			return true;
		}

		return response;
	}

	/**
	 * Check if this application key has a capability.
	 * 
	 * @param {string} capability The capability to match.
	 * @returns {boolean}
	 */
	hasCapability(capability) {
		return this.capabilities.includes(capability);
	}

	/**
	 * Check if this application key has the `listKeys` capability.
	 * 
	 * @returns {boolean}
	 */
	canListKeys() {
		return this.hasCapability(CAPABILITIES.LIST_KEYS);
	}

	/**
	 * Check if this application key has the `writeKeys` capability.
	 * 
	 * @returns {boolean}
	 */
	canWriteKeys() {
		return this.hasCapability(CAPABILITIES.WRITE_KEYS);
	}

	/**
	 * Check if this application key has the `deleteKeys` capability.
	 * 
	 * @returns {boolean}
	 */
	canDeleteKeys() {
		return this.hasCapability(CAPABILITIES.DELETE_KEYS);
	}

	/**
	 * Check if this application key has the `listBuckets` capability.
	 * 
	 * @returns {boolean}
	 */
	canListBuckets() {
		return this.hasCapability(CAPABILITIES.LIST_BUCKETS);
	}

	/**
	 * Check if this application key has the `listAllBuckets` capability.
	 * 
	 * @returns {boolean}
	 */
	canListAllBuckets() {
		return this.hasCapability(CAPABILITIES.LIST_ALL_BUCKETS);
	}

	/**
	 * Check if this application key has the `writeBuckets` capability.
	 * 
	 * @returns {boolean}
	 */
	canWriteBuckets() {
		return this.hasCapability(CAPABILITIES.WRITE_BUCKETS);
	}

	/**
	 * Check if this application key has the `deleteBuckets` capability.
	 * 
	 * @returns {boolean}
	 */
	canDeleteBuckets() {
		return this.hasCapability(CAPABILITIES.DELETE_BUCKETS);
	}

	/**
	 * Check if this application key has the `readBucketRetentions` capability.
	 * 
	 * @returns {boolean}
	 */
	canReadBucketRetentions() {
		return this.hasCapability(CAPABILITIES.READ_BUCKET_RETENTIONS);
	}

	/**
	 * Check if this application key has the `writeBucketRetentions` capability.
	 * 
	 * @returns {boolean}
	 */
	canWriteBucketRetentions() {
		return this.hasCapability(CAPABILITIES.WRITE_BUCKET_RETENTIONS);
	}

	/**
	 * Check if this application key has the `readBucketEncryption` capability.
	 * 
	 * @returns {boolean}
	 */
	canReadBucketEncryption() {
		return this.hasCapability(CAPABILITIES.READ_BUCKET_ENCRYPTION);
	}

	/**
	 * Check if this application key has the `writeBucketEncryption` capability.
	 * 
	 * @returns {boolean}
	 */
	canWriteBucketEncryption() {
		return this.hasCapability(CAPABILITIES.WRITE_BUCKET_ENCRYPTION);
	}

	/**
	 * Check if this application key has the `listFiles` capability.
	 * 
	 * @returns {boolean}
	 */
	canListFiles() {
		return this.hasCapability(CAPABILITIES.LIST_FILES);
	}

	/**
	 * Check if this application key has the `readFiles` capability.
	 * 
	 * @returns {boolean}
	 */
	canReadFiles() {
		return this.hasCapability(CAPABILITIES.READ_FILES);
	}

	/**
	 * Check if this application key has the `shareFiles` capability.
	 * 
	 * @returns {boolean}
	 */
	canShareFiles() {
		return this.hasCapability(CAPABILITIES.SHARE_FILES);
	}

	/**
	 * Check if this application key has the `writeFiles` capability.
	 * 
	 * @returns {boolean}
	 */
	canWriteFiles() {
		return this.hasCapability(CAPABILITIES.WRITE_FILES);
	}

	/**
	 * Check if this application key has the `deleteFiles` capability.
	 * 
	 * @returns {boolean}
	 */
	canDeleteFiles() {
		return this.hasCapability(CAPABILITIES.DELETE_FILES);
	}

	/**
	 * Check if this application key has the `readFileRetentions` capability.
	 * 
	 * @returns {boolean}
	 */
	canReadFileRetentions() {
		return this.hasCapability(CAPABILITIES.READ_FILE_RETENTIONS);
	}

	/**
	 * Check if this application key has the `writeFileRetentions` capability.
	 * 
	 * @returns {boolean}
	 */
	canWriteFileRetentions() {
		return this.hasCapability(CAPABILITIES.WRITE_FILE_RETENTIONS);
	}

	/**
	 * Check if this application key has the `bypassGovernance` capability.
	 * 
	 * @returns {boolean}
	 */
	canBypassGovernance() {
		return this.hasCapability(CAPABILITIES.BYPASS_GOVERNANCE);
	}
}

export default Key;