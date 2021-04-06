import B2Object from './b2-object';
import {
	HTTP_STATUS_CODES,
	SINGLE_FILE_MIN_SIZE,
	SINGLE_FILE_MAX_SIZE,
	LARGE_FILE_MIN_SIZE,
	LARGE_FILE_MAX_SIZE
} from './constants';
import { B2Error, InvalidFileSizeError } from './errors';
import { getPartSha1Array } from './utils';

/**
 * @typedef {"start" | "upload" | "hide" | "folder"} B2FileAction
 * @enum {B2FileAction}
 */
export const FILE_ACTIONS = {
	START:  'start',
	UPLOAD: 'upload',
	HIDE:   'hide',
	COPY:   'copy',
	FOLDER: 'folder',
};

/**
 * @typedef {import('./actions/file').B2SSEConfig} B2SSEConfig
 */

/**
 * @typedef {import('axios').AxiosResponse} AxiosResponse
 */

/**
 * @typedef {import('./bucket').default} Bucket
 */

/**
 * @typedef {object} B2DownloadAuthorization
 * @property {string} bucketId           The identifier for the bucket. 
 * @property {string} fileNamePrefix     The prefix for files the authorization token will allow access to.
 * @property {string} authorizationToken The authorization token that can be passed in the Authorization header or as an Authorization parameter.
 */

/**
 * @augments B2Object
 */
class File extends B2Object {

	/**
	 * @returns {string} The account that owns the file.
	 */
	get accountId() {
		return this._accountId;
	}

	/**
	 * @param {string} accountId The account that owns the file.
	 */
	set accountId(accountId) {
		this._accountId = accountId;
	}

	/**
	 * One of `start`, `upload`, `hide`, `folder`, or other values added in the future.
	 * * `upload` - means a file that was uploaded to B2 Cloud Storage.
	 * * `start` - means that a large file has been started, but not finished or canceled.
	 * * `hide` - means a file version marking the file as hidden.
	 * * `folder` - is used to indicate a virtual folder when listing files. 
	 * 
	 * @returns {B2FileAction}
	 */
	get action() {
		return this._action;
	}

	/**
	 * @param {B2FileAction} action One of `start`, `upload`, `hide`, `folder`, or other values added in the future.
	 */
	set action(action) {
		this._action = action;
	}

	/**
	 * @returns {string} The ID of the bucket that the file is in.
	 */
	get bucketId() {
		return this._bucketId || this.bucket ? this.bucket.bucketId : undefined;
	}

	/**
	 * @param {string} bucketId The ID of the bucket that the file is in.
	 */
	set bucketId(bucketId) {
		this._bucketId = bucketId;
	}

	/**
	 * @returns {string} The name of bucket that the file is in.
	 */
	get bucketName() {
		return this._bucketName || this.bucket ? this.bucket.bucketname : undefined;
	}

	/**
	 * @param {string} bucketName The name of bucket that the file is in.
	 */
	set bucketName(bucketName) {
		this._bucketName = bucketName;
	}

	/**
	 * @returns {Bucket?} The bucket that the file is in.
	 */
	get bucket() {
		return this._bucket;
	}

	/**
	 * @param {Bucket} bucket The bucket that the file is in.
	 */
	set bucket(bucket) {
		this._bucket = bucket;
	}

	/**
	 * Only useful when the action is `upload`. Always `0` when the action is `start`, `hide`, or `folder`. 
	 * 
	 * @returns {number} The number of bytes stored in this file.
	 */
	get contentLength() {
		return this._contentLength;
	}

	/**
	 * @param {number} contentLength The number of bytes stored in this file.
	 */
	set contentLength(contentLength) {
		this._contentLength = contentLength;
	}

	/**
	 * Large files do not have SHA1 checksums, and the value is "none". The value is *null* when the action is `hide` or `folder`.
	 * 
	 * @returns {string} The SHA1 of the bytes stored in the file as a 40-digit hex string.
	 */
	get contentSha1() {
		return this._contentSha1;
	}

	/**
	 * @param {string} contentSha1 The SHA1 of the bytes stored in the file as a 40-digit hex string.
	 */
	set contentSha1(contentSha1) {
		this._contentSha1 = contentSha1;
	}

	/**
	 * Not all files have an MD5 checksum, so this field is optional, and set to null for files that do not have one.
	 * Large files do not have MD5 checksums, and the value is null. The value is also null when the action is `hide` or `folder`.
	 * 
	 * @returns {string} The MD5 of the bytes stored in the file as a 32-digit hex string.
	 */
	get contentMd5() {
		return this._contentMd5;
	}

	/**
	 * @param {string} contentMd5 The MD5 of the bytes stored in the file as a 32-digit hex string.
	 */
	set contentMd5(contentMd5) {
		this._contentMd5 = contentMd5;
	}

	/**
	 * When the action is `upload` or `start`, the MIME type of the file, as specified when the file was uploaded.
	 * For `hide` action, always `application/x-bz-hide-marker`. For `folder` action, always *null*.
	 * 
	 * @returns {string} The MIME type of the file.
	 */
	get contentType() {
		return this._contentType;
	}

	/**
	 * @param {string} contentType The MIME type of the file.
	 */
	set contentType(contentType) {
		this._contentType = contentType;
	}

	/**
	 * Used with **b2_get_file_info**, **b2_download_file_by_id**, and **b2_delete_file_version**. The value is null for action `folder`.
	 * 
	 * @returns {string} The unique identifier for this version of this file.
	 */
	get fileId() {
		return this._fileId;
	}

	/**
	 * @param {string} fileId The unique identifier for this version of this file.
	 */
	set fileId(fileId) {
		this._fileId = fileId;
	}

	/**
	 * This is a JSON object, holding the name/value pairs that were uploaded with the file.
	 * 
	 * @returns {object.<string, string>} The custom information that was uploaded with the file.
	 */
	get fileInfo() {
		return this._fileInfo;
	}

	/**
	 * @param {object.<string, string>} fileInfo The custom information that was uploaded with the file.
	 */
	set fileInfo(fileInfo) {
		this._fileInfo = fileInfo;
	}

	/**
	 * The name of this file, which can be used with **b2_download_file_by_name**.
	 * 
	 * @returns {string} The name of this file.
	 */
	get fileName() {
		return this._fileName;
	}

	/**
	 * @param {string} fileName The name of this file.
	 */
	set fileName(fileName) {
		this._fileName = fileName;
	}

	/**
	 * @returns {B2SSEConfig}
	 */
	get serverSideEncryption() {
		return this._serverSideEncryption;
	}

	/**
	 * @param {B2SSEConfig} serverSideEncryption The serverSideEncryption.
	 */
	set serverSideEncryption(serverSideEncryption) {
		this._serverSideEncryption = serverSideEncryption;
	}

	/**
	 * This is a UTC time when this file was uploaded. It is a base 10 number of milliseconds since midnight, January 1, 1970.
	 * Always 0 when the action is `folder`.
	 * 
	 * @returns {number} The UTC timestamp when this file was uploaded.
	 */
	get uploadTimestamp() {
		return this._uploadTimestamp;
	}

	/**
	 * @param {number} uploadTimestamp The UTC timestamp when this file was uploaded.
	 */
	set uploadTimestamp(uploadTimestamp) {
		this._uploadTimestamp = uploadTimestamp;
	}

	/**
	 * @returns {string|Blob|Buffer|ReadableStream} The data of this file object.
	 */
	get data() {
		return this._data;
	}

	/**
	 * @param {string|Blob|Buffer|ReadableStream} data The data of this file object.
	 */
	set data(data) {
		this._data = data;
	}

	/**
	 * A base 10 number which represents a UTC time in milliseconds since midnight, January 1, 1970 when the original source file was last modified.
	 * 
	 * If the original source of the file being uploaded has a last modified time concept, Backblaze recommends using
	 * this to allow different B2 clients and the B2 web user interface to interoperate correctly.
	 * 
	 * @returns {number}
	 */
	get lastModified() {
		return this._lastModified;
	}

	/**
	 * @param {number} lastModified The last modified UTC timestamp of this file in base 10 milliseconds since midnight, January 1, 1970.
	 */
	set lastModified(lastModified) {
		this._lastModified = lastModified;
	}

	/**
	 * @returns {URL} The basic download URL for this file.
	 */
	get downloadUrl() {
		this.checkClient();

		return this._b2.file.getDownloadURL({
			bucketName: this.bucketName,
			fileName:   this.fileName
		});
	}

	/**
	 * Uploads a file, automatically choosing single-file or large-file mode.
	 * 
	 * @param {object}      [args]                      Method arguments.
	 * @param {string}      [args.uploadUrl]            URL of the upload destination.
	 * @param {string}      [args.authorizationToken]   Upload authorization token.
	 * @param {B2SSEConfig} [args.serverSideEncryption] If set, B2 will encrypt the uploaded data before storing the file.
	 * @param {Function}    [args.onUploadProgress]     A callback to pass to Axios `onUploadProgress`.
	 * 
	 * @throws {InvalidFileSizeError} When the file size is not accepted by any available upload methods.
	 * 
	 * @returns {File} This file if this file was successfully uploaded.
	 */
	async upload(args) {
		const recommendedPartSize = this._b2.authorization.recommendedPartSize;

		// Upload as a large file if larger than the recomended part size or the maximum size of a single file, but smaller than the maximum size of a large file.
		if ((this.size > recommendedPartSize || this.size > SINGLE_FILE_MAX_SIZE) && this.size <= LARGE_FILE_MAX_SIZE) {
			this.uploadLarge(args);
		}

		// Upload as a single file if larger than the minimum single file size and smaller than the maximum single file size
		if (this.size > SINGLE_FILE_MIN_SIZE && this.size <= SINGLE_FILE_MAX_SIZE) {
			return this.uploadSingle(args);
		}

		throw new InvalidFileSizeError;
	}

	/**
	 * Uploads this file as a single file.
	 * 
	 * @param {object}   [args]                    Method arguments.
	 * @param {string}   [args.uploadUrl]          URL of the upload destination.
	 * @param {string}   [args.authorizationToken] Upload authorization token.
	 * @param {Function} [args.onUploadProgress]   A callback to pass to Axios `onUploadProgress`.
	 * @returns {File|AxiosResponse} This file if this file was successfully uploaded.
	 * @throws {B2Error} When the file has already been uploaded.
	 * @throws {InvalidFileSizeError} When the file doesn't fall between the minimum and maximum file size allowed by this API.
	 */
	async uploadSingle(args) {
		this.checkClient();

		if (this._uploadTimestamp) {
			throw new B2Error('This file is uploaded');
		}

		if (this.size < SINGLE_FILE_MIN_SIZE || this.size > SINGLE_FILE_MAX_SIZE) {
			throw new InvalidFileSizeError;
		}

		const response = await this._b2.file.upload({
			fileName:           this.fileName,
			data:               this.data,
			lastModified:       this.lastModified,
			bucketId:           this.bucketId,
			uploadUrl:          args.uploadUrl,
			authorizationToken: args.authorizationToken,
			onUploadProgress:   args.onUploadProgress,
		});

		if (response.status === HTTP_STATUS_CODES.OK) {
			this._fileId          = response.data.fileId;
			this._contentMd5      = response.data.contentMd5;
			this._uploadTimestamp = response.data.uploadTimestamp;

			return this;
		}

		return response;
	}

	/**
	 * Uploads this file as a large file.
	 * 
	 * @todo Allow string, Blob/File, Buffer, and ArrayBuffer types.
	 * 
	 * @param {object} [args]                      Method arguments.
	 * @param {NewType} [args.serverSideEncryption] If set, B2 will encrypt the uploaded data before storing the file.
	 * 
	 * @throws {TypeError}            When the file data is of a type that cannot be uploaded using this method.
	 * @throws {B2Error}              When the file has already been uploaded.
	 * @throws {InvalidFileSizeError} When the file doesn't fall between the minimum and maximum file size allowed by this API.
	 * 
	 * @returns {File|AxiosResponse} This file if this file was successfully uploaded.
	 */
	async uploadLarge(args = {}) {
		this.checkClient();

		if (this._uploadTimestamp) {
			throw new B2Error('This file is uploaded');
		}

		if (this.size < LARGE_FILE_MIN_SIZE || this.size > LARGE_FILE_MAX_SIZE) {
			throw new InvalidFileSizeError;
		}

		// This only works with readable streams
		if (toString.call(this.data) !== '[object ReadableStream]') {
			throw new TypeError('File data must be of type ReadableStream');
		}

		// Start large file
		const { fileId } = await this._b2.largeFile.start({
			bucketId:             this.bucketId,
			fileName:             this.fileName,
			contentType:          this.contentType,
			fileInfo:             this.fileInfo,
			serverSideEncryption: this.serverSideEncryption,
		}).data;

		this.fileId = fileId;

		// Upload parts
		const recommendedPartSize = this._b2.authorization.recommendedPartSize;
		const partChecksums = {};
		const _this = this;
		let partCount = 0;

		this.data.on('readable', async () => {
			let chunk;

			// Get upload URL and token
			const { uploadUrl, authorizationToken } = await this._b2.largeFile.getUploadPartUrl({ fileId }).data;

			while (null !== (chunk = _this.data.read(recommendedPartSize))) {
				partCount++;

				// Upload part
				const {partNumber, contentSha1} = await _this._b2.largeFile.uploadPart({
					uploadUrl,
					authorizationToken,
					partNumber:           partCount,
					data:                 chunk,
					serverSideEncryption: args.serverSideEncryption,
				}).data;

				partChecksums[partNumber] = contentSha1;
			}
		});

		// Finish large file
		this.data.on('end', async () => {
			const response = await this._b2.largeFile.finish({
				fileId,
				partSha1Array: getPartSha1Array(partChecksums),
			});

			this.contentMd5      = response.data.contentMd5;
			this.uploadTimestamp = response.data.uploadTimestamp;
		});
	}

	/**
	 * Hides this file.
	 * 
	 * @returns {boolean} True if this file was successfully hidden.
	 */
	async hide() {
		this.checkClient();

		const response = await this._b2.file.hide({
			fileId: this.fileId,
		});

		return response.data.fileId === this.fileId;
	}

	/**
	 * Deletes all versions of this file.
	 * 
	 * @returns {number} The number of versions deleted.
	 */
	async delete() {
		this.checkClient();

		return this._b2.file.deleteAllVersions({
			bucketId: this.bucketId,
			fileName: this.fileName,
		});
	}

	/**
	 * Deletes this file version.
	 * 
	 * @returns {boolean|AxiosResponse} True if this file was successfully deleted.
	 */
	async deleteVersion() {
		this.checkClient();

		const response = await this._b2.file.deleteVersion({
			fileId: this.fileId,
		});

		return response.data.fileId === this.fileId;
	}

	/**
	 * Creates a new file by copying from an existing file.
	 * 
	 * @param {object} args          Method arguments.
	 * @param {string} args.fileName Name of the new file being created.
	 * @returns {File}
	 */
	async copy(args) {
		this.checkClient();

		const response = await this._b2.file.copy({
			...args,
			sourceFileId: this.fileId,
		});

		return response.data;
	}

	/**
	 * Gets information about this file, if the fileId is set.
	 * 
	 * @returns {File}
	 */
	async getInfo() {
		this.checkClient();

		const response = await this._b2.file.getInfo({
			fileId: this.fileId,
		});

		if (response.data.fileId === this.fileId) {
			Object.assign(this, response.data);
		}

		return this;
	}

	/**
	 * Gets the download authorization token for this file.
	 * 
	 * @param {object} args                        Method arguments.
	 * @param {number} args.validDurationInSeconds Number of seconds before the authorization token will expire.
	 * @returns {B2DownloadAuthorization?}
	 */
	async getDownloadAuthorization(args = {}) {
		this.checkClient();

		const response = await this._b2.file.getDownloadAuthorization({
			...args,
			bucketId:               this.bucketId,
			fileNamePrefix:         this.fileName,
		});

		if (response.data.bucketId === this.bucketId) {
			return response.data;
		}

		return null;
	}

	/**
	 * 
	 * @param {object} [args] 
	 * @param {string} [args.bucketId]
	 * @param {string} [args.bucketName]
	 * 
	 * @returns {URL}
	 */
	async getDownloadUrl(args = {}) {
		this.checkClient();

		// Fetch the name of the bucket, if a Bucket ID is available
		if (
			(!this.bucketName || !args.bucketName) &&
			(this.bucketId || args.bucketId)
		) {
			const bucket = this._b2.bucket.get({
				bucketId: this.bucketId || args.bucketId,
			});

			args.bucketName = bucket.bucketName;
		}

		return await this._b2.file.getDownloadUrl({
			bucketName: args.bucketName,
			fileName:   this.fileName,
		});
	}

	/**
	 * 
	 * @param {object} [args]
	 * 
	 * @returns {*}
	 */
	async download(args = {}) {
		this.checkClient();

		return await this._b2.file.downloadById({
			...args,
			fileId: this.fileId,
		});
	}
}

export default File;