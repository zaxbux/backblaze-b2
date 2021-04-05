import B2Object from './b2-object';
import {
	HTTP_STATUS_CODES,
	SINGLE_FILE_MIN_SIZE,
	SINGLE_FILE_MAX_SIZE,
	LARGE_FILE_MIN_SIZE,
	LARGE_FILE_MAX_SIZE
} from './constants';
import { B2Error } from './errors';
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
	 * @returns {string}
	 */
	get accountId() {
		return this._accountId;
	}

	/**
	 * @param {string} accountId The accountId.
	 */
	set accountId(accountId) {
		this._accountId = accountId;
	}

	/**
	 * @returns {B2FileAction}
	 */
	get action() {
		return this._action;
	}

	/**
	 * @param {B2FileAction} action The action.
	 */
	set action(action) {
		this._action = action;
	}

	/**
	 * @returns {string}
	 */
	get bucketId() {
		return this._bucketId || this.bucket ? this.bucket.bucketId : undefined;
	}

	/**
	 * @param {string} bucketId The bucketId.
	 */
	set bucketId(bucketId) {
		this._bucketId = bucketId;
	}

	/**
	 * @returns {string}
	 */
	get bucketName() {
		return this._bucketName || this.bucket ? this.bucket.bucketname : undefined;
	}

	/**
	 * @param {string} bucketName The bucketName.
	 */
	set bucketName(bucketName) {
		this._bucketName = bucketName;
	}

	/**
	 * @returns {Bucket?}
	 */
	get bucket() {
		return this._bucket;
	}

	/**
	 * @param {Bucket} bucket The bucket.
	 */
	set bucket(bucket) {
		this._bucket = bucket;
	}

	/**
	 * @returns {number}
	 */
	get contentLength() {
		return this._contentLength;
	}

	/**
	 * @param {number} contentLength The contentLength.
	 */
	set contentLength(contentLength) {
		this._contentLength = contentLength;
	}

	/**
	 * @returns {string}
	 */
	get contentSha1() {
		return this._contentSha1;
	}

	/**
	 * @param {string} contentSha1 The contentSha1.
	 */
	set contentSha1(contentSha1) {
		this._contentSha1 = contentSha1;
	}

	/**
	 * @returns {string}
	 */
	get contentMd5() {
		return this._contentMd5;
	}

	/**
	 * @param {string} contentMd5 The contentMd5.
	 */
	set contentMd5(contentMd5) {
		this._contentMd5 = contentMd5;
	}

	/**
	 * @returns {string}
	 */
	get contentType() {
		return this._contentType;
	}

	/**
	 * @param {string} contentType The contentType.
	 */
	set contentType(contentType) {
		this._contentType = contentType;
	}

	/**
	 * @returns {string}
	 */
	get fileId() {
		return this._fileId;
	}

	/**
	 * @param {string} fileId The fileId.
	 */
	set fileId(fileId) {
		this._fileId = fileId;
	}

	/**
	 * @returns {object.<string, string>}
	 */
	get fileInfo() {
		return this._fileInfo;
	}

	/**
	 * @param {object.<string, string>} fileInfo The fileInfo.
	 */
	set fileInfo(fileInfo) {
		this._fileInfo = fileInfo;
	}

	/**
	 * @returns {string}
	 */
	get fileName() {
		return this._fileName;
	}

	/**
	 * @param {string} fileName The fileName.
	 */
	set fileName(fileName) {
		this._fileName = fileName;
	}

	/**
	 * @returns {string}
	 */
	get serverSideEncryption() {
		return this._serverSideEncryption;
	}

	/**
	 * @param {string} serverSideEncryption The serverSideEncryption.
	 */
	set serverSideEncryption(serverSideEncryption) {
		this._serverSideEncryption = serverSideEncryption;
	}

	/**
	 * @returns {number}
	 */
	get uploadTimestamp() {
		return this._uploadTimestamp;
	}

	/**
	 * @param {number} uploadTimestamp The uploadTimestamp.
	 */
	set uploadTimestamp(uploadTimestamp) {
		this._uploadTimestamp = uploadTimestamp;
	}

	/**
	 * @returns {string|Blob|Buffer|ReadableStream}
	 */
	get data() {
		return this._data;
	}

	/**
	 * @param {string|Blob|Buffer|ReadableStream} data The data.
	 */
	set data(data) {
		this._data = data;
	}

	/**
	 * @returns {number}
	 */
	get lastModified() {
		return this._lastModified;
	}

	/**
	 * @param {number} lastModified The lastModified.
	 */
	set lastModified(lastModified) {
		this._lastModified = lastModified;
	}

	/**
	 * Uploads a file, automatically choosing single-file or large-file mode.
	 * 
	 * @param {object}   [args]                      Method arguments.
	 * @param {string}   [args.uploadUrl]            URL of the upload destination.
	 * @param {string}   [args.authorizationToken]   Upload authorization token.
	 * @param {Function} [args.serverSideEncryption] If set, B2 will encrypt the uploaded data before storing the file.
	 * @param {Function} [args.onUploadProgress]     A callback to pass to Axios `onUploadProgress`.
	 * @returns {File|AxiosResponse} This file if this file was successfully uploaded.
	 * @throws {Error} If no upload methods that can process the file size are available.
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

		throw new Error('File size is unacceptable');
	}

	/**
	 * Uploads this file as a single file.
	 * 
	 * @param {object}   [args]                    Method arguments.
	 * @param {string}   [args.uploadUrl]          URL of the upload destination.
	 * @param {string}   [args.authorizationToken] Upload authorization token.
	 * @param {Function} [args.onUploadProgress]   A callback to pass to Axios `onUploadProgress`.
	 * @returns {File|AxiosResponse} This file if this file was successfully uploaded.
	 * @throws {Error}
	 */
	async uploadSingle(args) {
		this.checkClient();

		if (this._uploadTimestamp) {
			throw new Error('This file is uploaded.');
		}

		if (this.size < SINGLE_FILE_MIN_SIZE || this.size > SINGLE_FILE_MAX_SIZE) {
			throw new B2Error('File size is unacceptable');
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
	 * @param {object}   [args]                      Method arguments.
	 * @param {Function} [args.serverSideEncryption] If set, B2 will encrypt the uploaded data before storing the file.
	 * @returns {File|AxiosResponse} This file if this file was successfully uploaded.
	 * @throws {Error}
	 */
	async uploadLarge(args) {
		this.checkClient();

		if (this.size < LARGE_FILE_MIN_SIZE || this.size > LARGE_FILE_MAX_SIZE) {
			throw new B2Error('File size is unacceptable');
		}

		// This only works with readable streams
		if (toString.call(this.data) !== '[object ReadableStream]') {
			throw new Error('File data must be of type ReadableStream');
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
			const { uploadUrl, authorizationToken } = await this._b2.largeFile.getUploadPartUrl({
				fileId: fileId,
			}).data;

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
				fileId: fileId,
				partSha1Array: getPartSha1Array(partChecksums),
			});

			this.contentMd5      = response.data.contentMd5;
			this.uploadTimestamp = response.data.uploadTimestamp;
		});
	}

	/**
	 * Hides this file.
	 * 
	 * @returns {boolean|AxiosResponse} True if this file was successfully hidden.
	 */
	async hide() {
		this.checkClient();

		const response = await this._b2.file.hide({
			fileId: this.fileId,
		});

		if (response.data.fileId === this.fileId) {
			return true;
		}

		return response;
	}

	/**
	 * Deletes all versions of this file.
	 * 
	 * @returns {number|AxiosResponse} The number of versions deleted.
	 */
	async delete() {
		this.checkClient();

		const response = await this._b2.file.deleteAllVersions({
			bucketId: this.bucketId,
			fileName: this.fileName,
		});

		return response;
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

		if (response.data.fileId === this.fileId) {
			return true;
		}

		return response;
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
	async getDownloadAuthorization(args) {
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

	async getDownloadUrl(args = {}) {
		this.checkClient();

		// Fetch the name of the bucket, if a Bucket ID is available
		if (!this.bucketName || !args.bucketName && (this.bucketId || args.bucketId)) {
			const bucket = this._b2.bucket.get({
				bucketId: this.bucketId || args.bucketId,
			});

			args.bucketName = bucket.bucketName;
		}

		return await this._b2.file.getDownloadUrl({
			bucketName: args.bucketName,
			fileName: this.fileName,
		});
	}

	async download(args) {
		this.checkClient();

		return await this._b2.file.downloadById({
			...args,
			fileId: this.fileId,
		});
	}
}

export default File;