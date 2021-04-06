/**
 * @file Contains the method for managing Files.
 */

import { isBlob, isFile } from 'axios/lib/utils';
import { API_VERSION, CONTENT_TYPE_AUTO } from '../constants';
import { InvalidArgumentError } from '../errors';
import { createSHA1Checksum, encodeB2String, getContentLength, makeB2SSEHeaders, makeBzInfoHeaders } from '../utils';
import B2Action from './base';
import File from '../file';

/**
 * See {@link https://www.backblaze.com/b2/docs/server_side_encryption.html}.
 * 
 * @typedef {object} B2SSEConfig
 * @property {"SSE-B2"|"SSE-C"} mode              Encryption mode, either `SSE-B2` or `SSE-C`.
 * @property {string}           algorithm         Encryption algoritm (only `SHA256` is supported).
 * @property {string}           [customerKey]     AES-256 encryption key, base64-encoded.
 * @property {string}           [customerKeyMd5]  MD5 digest of the key, base64-encoded.
 */

/**
 * @class
 * @classdesc Methods for managing B2 files.
 * 
 * See {@link https://www.backblaze.com/b2/docs/files.html}.
 * 
 * @augments B2Action
 */
class FileActions extends B2Action {

	/**
	 * Uploads one file to B2.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_upload_file.html}.
	 * 
	 * @b2TransactionClass A
	 * @param {object}                  args                        Method arguments.
	 * @param {string}                  args.fileName               Name of the file.
	 * @param {*}                       args.data                   Data to upload.
	 * @param {string}                  [args.uploadUrl]            URL of the upload destination.
	 * @param {string}                  [args.authorizationToken]   Upload authorization token.
	 * @param {string}                  [args.bucketId]             ID of the bucket to upload to. Optional, will be used to get an upload url if not present.
	 * @param {string}                  [args.contentType]          MIME type of the content of the file, defaults to b2/x-auto.
	 * @param {string}                  [args.contentLength]        Number of bytes in the file being uploaded, will be calculated if not provided.
	 * @param {string}                  [args.hash]                 SHA1 checksum of the content of the file, will be calculated if not provided.
	 * @param {object.<string, string>} [args.info]                 Custom information metadata to store with the file.
	 * @param {number}                  [args.lastModified]         Last modified timestamp of the file.
	 * @param {B2SSEConfig}             [args.serverSideEncryption] If set, B2 will encrypt the uploaded data before storing the file.
	 * @param {Function}                [args.onUploadProgress]     A callback to pass to Axios `onUploadProgress`.
	 * @returns {Promise<AxiosResponse>}
	 * @throws {InvalidArgumentError}
	 */
	async upload(args) {
		if (!args || !args.fileName) {
			throw new InvalidArgumentError('The `fileName` parameter is required');
		}

		if (!args.data) {
			throw new InvalidArgumentError('The `data` parameter is required');
		}

		// Fetch an upload URL if not provided but the bucket ID was provided.
		if (!args.uploadUrl && args.bucketId) {
			const response = await this._b2.bucket.getUploadUrl({
				bucketId: args.bucketId,
			});

			args.uploadUrl          = response.data.uploadUrl;
			args.authorizationToken = response.data.authorizationToken;
		}

		if (!args.uploadUrl) {
			throw new InvalidArgumentError('The `uploadUrl` (or `bucketId`) parameter is required');
		}

		if (!args.authorizationToken) {
			throw new InvalidArgumentError('The `authorizationToken` (or `bucketId`) parameter is required');
		}

		const bzInfoHeaders = makeBzInfoHeaders(args.info);

		let lastModified;

		if (!args.contentType && isBlob(args.data)) {
			args.contentType = args.data.type;
		}
		
		if (!args.lastModified && isFile(args.data)) {
			lastModified = args.data.lastModified;
		}

		return await this._b2.client.post(args.uploadUrl, args.data, {
			headers: {
				...bzInfoHeaders,
				'Authorization':                      args.uploadAuthToken,
				'Content-Type':                       args.contentType               || CONTENT_TYPE_AUTO,
				'Content-Length':                     args.contentLength             || getContentLength(args.data),
				'X-Bz-File-Name':                     encodeB2String(args.fileName),
				'X-Bz-Content-Sha1':                  args.hash                      || (args.data ? createSHA1Checksum(args.data) : null),
				'X-Bz-Info-src_last_modified_millis': lastModified,
				...(makeBzInfoHeaders(args.serverSideEncryption) || {}),
			},
			maxRedirects: 0,
			onUploadProgress: args.onUploadProgress
		});
	}

	/**
	 * Lists the names of files in a bucket.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_list_file_names.html}.
	 * 
	 * @b2TransactionClass C
	 * @param {object}  args                     Method arguments.
	 * @param {string}  args.bucketId            Bucket to look for file names in.
	 * @param {string}  [args.startFileName]     First file name to return.
	 * @param {number}  [args.maxFileCount=1000] Maximum number of files to return.
	 * @param {string}  [args.prefix]            Files returned will be limited to those with the given prefix.
	 * @param {string}  [args.delimiter]         Files returned will be limited to those within the top folder, or any one subfolder.
	 * @returns {Promise<AxiosResponse>}
	 * @throws {InvalidArgumentError}
	 */
	async listNames(args) {
		if (!args || !args.bucketId) {
			throw new InvalidArgumentError('The `bucketId` parameter is required');
		}

		return await this._b2.client.post('/b2_list_file_names', {
			data: {
				bucketId:      args.bucketId,
				startFileName: args.startFileName || '',
				maxFileCount:  args.maxFileCount || 1000,
				prefix:        args.prefix || '',
				delimiter:     args.delimiter
			}
		}, {
			transformResponse: (data) => this.transformResponse(data, (data) => {
				if (data.files) {
					data.files = data.files.map((file) => {
						return new File(file, this._b2);
					}, this);
				}

				return data;
			}),
		});
	}


	/**
	 * Lists the names of all files in a bucket.
	 * 
	 * @see {FileAction.listNames}
	 * 
	 * @b2TransactionClass C
	 * @param {object} args          Method arguments.
	 * @param {string} args.bucketId Bucket to look for file names in.
	 * @returns {Array<object>}
	 */
	async listAllNames(args) {
		const files = [];
		let startFileName = args.startFileName;

		while (startFileName !== null) {
			const response = this.listNames({...args, startFileName});

			files.concat(response.data.files);

			startFileName = response.data.nextFileName;
		}

		return files;
	}

	/**
	 * Lists the versions of the files contained in one bucket.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_list_file_versions.html}.
	 * 
	 * @b2TransactionClass C
	 * @param {object}  args                     Method arguments.
	 * @param {string}  args.bucketId            Bucket to look for file names in.
	 * @param {string}  [args.startFileName]     First file name to return.
	 * @param {string}  [args.startFileId]       First ID to return (startFileName must also be provided).
	 * @param {number}  [args.maxFileCount=1000] Maximum number of files to return.
	 * @param {string}  [args.prefix]            Files returned will be limited to those with the given prefix.
	 * @param {string}  [args.delimiter]         Files returned will be limited to those within the top folder, or any one subfolder.
	 * @returns {Promise<AxiosResponse>}
	 * @throws {InvalidArgumentError}
	 */
	async listVersions(args) {
		if (!args || !args.bucketId) {
			throw new InvalidArgumentError('The `bucketId` parameter is required');
		}

		if (args.startFileId && !args.startFileName) {
			throw new InvalidArgumentError('When the `startFileId` parameter is provided, `startFileName` must also be provided');
		}

		return await this._b2.client.post('/b2_list_file_versions', {
			data: {
				bucketId:      args.bucketId,
				startFileId:   args.startFileId,
				startFileName: args.startFileName || '',
				maxFileCount:  args.maxFileCount || 1000,
				prefix:        args.prefix || '',
			}
		}, {
			transformResponse: (data) => this.transformResponse(data, (data) => {
				if (data.files) {
					data.files = data.files.map((file) => {
						return new File(file, this._b2);
					}, this);
				}

				return data;
			}),
		});
	}

	/**
	 * Lists all of the versions of all files contained in one bucket.
	 * 
	 * @see B2#listVersions
	 * 
	 * @b2TransactionClass C
	 * @param {object} [args] Method arguments.
	 * @returns {Array<object>}
	 */
	async listAllVersions(args) {
		const files = [];

		let startFileName = args.startFileName;
		let startFileId   = args.startFileId;

		while (startFileName !== null && startFileId !== null) {
			const response = this.listVersions({...args, startFileName, startFileId});

			files.concat(response.data.files);

			startFileName = response.data.nextFileName;
			startFileId   = response.data.nextFileId;
		}

		return files;
	}

	/**
	 * Hides a file so that downloading by name will not find the file.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_hide_file.html}.
	 * 
	 * @b2TransactionClass A
	 * @param {object} args          Method arguments.
	 * @param {string} args.bucketId Bucket containing the file to hide.
	 * @param {string} args.fileName Name of the file to hide.
	 * @returns {Promise<AxiosResponse>}
	 * @throws {InvalidArgumentError}
	 */
	async hide(args) {
		if (!args || !args.bucketId) {
			throw new InvalidArgumentError('The `bucketId` parameter is required');
		}

		if (!args.fileName) {
			throw new InvalidArgumentError('The `fileName` parameter is required');
		}

		return await this._b2.client.post('/b2_hide_file', {
			bucketId: args.bucketId,
			fileName: args.fileName
		});
	}

	/**
	 * Gets information about one file stored in B2.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_get_file_info.html}.
	 * 
	 * @b2TransactionClass B
	 * @param {object} args        Method arguments.
	 * @param {string} args.fileId ID of the file.
	 * @returns {Promise<AxiosResponse>}
	 * @throws {InvalidArgumentError}
	 */
	async getInfo(args) {
		if (!args || !args.fileId) {
			throw new InvalidArgumentError('The `fileId` parameter is required');
		}

		return await this._b2.client.post('/b2_get_file_info', {
			fileId: args.fileId
		}, {
			transformResponse: (data) => this.transformResponse(data, (data) => {
				return new File(data, this._b2);
			}),
		});
	}

	/**
	 * Used to generate an authorization token that can be used to download files.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_get_download_authorization.html}.
	 * 
	 * @b2TransactionClass C
	 * @param {object} args                        Method arguments.
	 * @param {string} args.bucketId               Identifier for the bucket.
	 * @param {string} args.fileNamePrefix         File name prefix of files the download authorization token will allow access to.
	 * @param {number} args.validDurationInSeconds Number of seconds before the authorization token will expire.
	 * @param {string} [args.b2ContentDisposition] Download requests using the returned authorization must include the same value.
	 * @param {string} [args.b2ContentLanguage]    Download requests using the returned authorization must include the same value.
	 * @param {string} [args.b2Expires]            Download requests using the returned authorization must include the same value.
	 * @param {string} [args.b2CacheControl]       Download requests using the returned authorization must include the same value.
	 * @param {string} [args.b2ContentEncoding]    Download requests using the returned authorization must include the same value.
	 * @param {string} [args.b2ContentType]        Download requests using the returned authorization must include the same value.
	 * @returns {Promise<AxiosResponse>}
	 * @throws {InvalidArgumentError}
	 */
	async getDownloadAuthorization(args) {
		if (!args || !args.bucketId) {
			throw new InvalidArgumentError('The `bucketId` parameter is required');
		}

		if (!args.fileNamePrefix) {
			throw new InvalidArgumentError('The `fileNamePrefix` parameter is required');
		}

		if (!args.validDurationInSeconds) {
			throw new InvalidArgumentError('The `validDurationInSeconds` parameter is required');
		}

		return await this._b2.client.post('/b2_get_download_authorization', {
			bucketId:               args.bucketId,
			fileNamePrefix:         args.fileNamePrefix,
			validDurationInSeconds: args.validDurationInSeconds,
			b2ContentDisposition:   args.b2ContentDisposition,
			b2ContentLanguage:      args.b2ContentLanguage,
			b2Expires:              args.b2Expires,
			b2CacheControl:         args.b2CacheControl,
			b2ContentEncoding:      args.b2ContentEncoding,
			b2ContentType:          args.b2ContentType,
		});
	}

	/**
	 * Downloads a file with the given fileId or bucketName and fileName.
	 * 
	 * @b2TransactionClass B
	 * @param {object}      args                            Method arguments.
	 * @param {string}      [args.bucketName]               Name of the bucket to download the file from.
	 * @param {string}      [args.fileName]                 Name of the file to download.
	 * @param {string}      [args.fileId]                   ID of the file to download.
	 * @param {string}      [args.authorization]            An account auth token to access all files in a private bucket, or a download auth token to access files with that prefix.
	 * @param {string}      [args.b2ContentDisposition]     B2 will use it as the value of the 'Content-Disposition' header, overriding the uploaded value.
	 * @param {string}      [args.b2ContentLanguage]        B2 will use it as the value of the 'Content-Language' header, overriding the uploaded value.
	 * @param {string}      [args.b2Expires]                B2 will use it as the value of the 'Expires' header, overriding the uploaded value.
	 * @param {string}      [args.b2CacheControl]           B2 will use it as the value of the 'Cache-Control' header, overriding the uploaded value.
	 * @param {string}      [args.b2ContentEncoding]        B2 will use it as the value of the 'Content-Encoding' header, overriding the uploaded value.
	 * @param {string}      [args.b2ContentType]            B2 will use it as the value of the 'Content-Type' header, overriding the uploaded value.
	 * @param {B2SSEConfig} [args.serverSideEncryption]     Required if the files were uploaded with server-side encryption using customer-managed keys.
	 * @param {boolean}     [args.axios.headersOnly=false]  Specifies if a HEAD request should be done instead of a GET request.
	 * @param {string}      [args.axios.responseType]       Axios responseType.
	 * @param {Function}    [args.axios.transformResponse]  Axios transformResponse.
	 * @param {Function}    [args.axios.onDownloadProgress] Axios onDownloadProgress (browser only).
	 * @returns {Promise<AxiosResponse>}
	 * @throws {InvalidArgumentError}
	 */
	async download(args = {}) {
		if (args.fileId) {
			return this.downloadById(args);
		}

		if (args.bucketName && args.fileName) {
			return this.downloadByName(args);
		}

		throw new InvalidArgumentError('Either the `fileId` parameter or the `bucketName` and `fileName` parameters are required');
	}

	/**
	 * Downloads one file by providing the name of the bucket and the name of the file.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_download_file_by_name.html}.
	 * 
	 * @b2TransactionClass B
	 * @param {object}      args                            Method arguments.
	 * @param {string}      args.bucketName                 Name of the bucket to download the file from.
	 * @param {string}      args.fileName                   Name of the file to download.
	 * @param {string}      [args.authorization]            An account auth token to access all files in a private bucket, or a download auth token to access files with that prefix.
	 * @param {string}      [args.b2ContentDisposition]     B2 will use it as the value of the 'Content-Disposition' header, overriding the uploaded value.
	 * @param {string}      [args.b2ContentLanguage]        B2 will use it as the value of the 'Content-Language' header, overriding the uploaded value.
	 * @param {string}      [args.b2Expires]                B2 will use it as the value of the 'Expires' header, overriding the uploaded value.
	 * @param {string}      [args.b2CacheControl]           B2 will use it as the value of the 'Cache-Control' header, overriding the uploaded value.
	 * @param {string}      [args.b2ContentEncoding]        B2 will use it as the value of the 'Content-Encoding' header, overriding the uploaded value.
	 * @param {string}      [args.b2ContentType]            B2 will use it as the value of the 'Content-Type' header, overriding the uploaded value.
	 * @param {B2SSEConfig} [args.serverSideEncryption]     Required if the files were uploaded with server-side encryption using customer-managed keys.
	 * @param {boolean}     [args.axios.headersOnly=false]  Specifies if a HEAD request should be done instead of a GET request.
	 * @param {string}      [args.axios.responseType]       Axios responseType.
	 * @param {Function}    [args.axios.transformResponse]  Axios transformResponse.
	 * @param {Function}    [args.axios.onDownloadProgress] Axios onDownloadProgress (browser only).
	 * @returns {Promise<AxiosResponse>}
	 * @throws {InvalidArgumentError}
	 */
	async downloadByName(args) {
		if (!args || !args.fileName) {
			throw new InvalidArgumentError('The `fileName` parameter is required');
		}

		if (!args.bucketName) {
			throw new InvalidArgumentError('The `bucketName` parameter is required');
		}

		return await this._b2.client.request({
			url:                this.getDownloadURL(args),
			method:             args.axios.headersOnly === true ? 'head' : 'get',
			responseType:       args.axios.responseType,
			encoding:           null,
			transformResponse:  args.axios.transformResponse,
			onDownloadProgress: args.axios.onDownloadProgress,
			headers: {
				range: args.range,
				...(makeB2SSEHeaders(args.serverSideEncryption))
			},
		});
	}

	/**
	 * Returns an absolute URL to a file with any authorization key and the parameters provided.
	 * 
	 * @param {objecy}      args                        Method arguments.
	 * @param {string}      args.bucketName             Name of the bucket to download the file from.
	 * @param {string}      args.fileName               Name of the file to download.
	 * @param {string}      [args.authorization]        An account auth token to access all files in a private bucket, or a download auth token to access files with that prefix.
	 * @param {string}      [args.b2ContentDisposition] B2 will use it as the value of the 'Content-Disposition' header, overriding the uploaded value.
	 * @param {string}      [args.b2ContentLanguage]    B2 will use it as the value of the 'Content-Language' header, overriding the uploaded value.
	 * @param {string}      [args.b2Expires]            B2 will use it as the value of the 'Expires' header, overriding the uploaded value.
	 * @param {string}      [args.b2CacheControl]       B2 will use it as the value of the 'Cache-Control' header, overriding the uploaded value.
	 * @param {string}      [args.b2ContentEncoding]    B2 will use it as the value of the 'Content-Encoding' header, overriding the uploaded value.
	 * @param {string}      [args.b2ContentType]        B2 will use it as the value of the 'Content-Type' header, overriding the uploaded value.
	 * @param {B2SSEConfig} [args.serverSideEncryption] Required if the files were uploaded with server-side encryption using customer-managed keys.
	 * @returns {Promise<AxiosResponse>}
	 * @throws {InvalidArgumentError}
	 */
	async getDownloadURL(args) {
		if (!args || !args.fileName) {
			throw new InvalidArgumentError('The `fileName` parameter is required');
		}

		if (!args.bucketName) {
			throw new InvalidArgumentError('The `bucketName` parameter is required');
		}

		const fileName = encodeB2String(args.fileName);

		const params = new URLSearchParams({
			Authorization:        args.authorization,
			b2ContentDisposition: args.b2ContentDisposition,
			b2ContentLanguage:    args.b2ContentLanguage,
			b2Expires:            args.b2Expires,
			b2CacheControl:       args.b2CacheControl,
			b2ContentEncoding:    args.b2ContentEncoding,
			b2ContentType:        args.b2ContentType,
			serverSideEncryption: JSON.stringify(args.serverSideEncryption),
		});

		return new URL(`${this._b2.authorization.downloadUrl}/file/${args.bucketName}/${fileName}` + params);
	}

	/**
	 * Downloads one file.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_download_file_by_id.html}.
	 * 
	 * @b2TransactionClass B
	 * @param {object}      args                            Method arguments.
	 * @param {string}      args.fileId                     ID of the file to download.
	 * @param {string}      [args.authorization]            An account auth token to access all files in a private bucket, or a download auth token to access files with that prefix.
	 * @param {string}      [args.b2ContentDisposition]     B2 will use it as the value of the 'Content-Disposition' header, overriding the uploaded value.
	 * @param {string}      [args.b2ContentLanguage]        B2 will use it as the value of the 'Content-Language' header, overriding the uploaded value.
	 * @param {string}      [args.b2Expires]                B2 will use it as the value of the 'Expires' header, overriding the uploaded value.
	 * @param {string}      [args.b2CacheControl]           B2 will use it as the value of the 'Cache-Control' header, overriding the uploaded value.
	 * @param {string}      [args.b2ContentEncoding]        B2 will use it as the value of the 'Content-Encoding' header, overriding the uploaded value.
	 * @param {string}      [args.b2ContentType]            B2 will use it as the value of the 'Content-Type' header, overriding the uploaded value.
	 * @param {B2SSEConfig} [args.serverSideEncryption]     Required if the files were uploaded with server-side encryption using customer-managed keys.
	 * @param {boolean}     [args.axios.headersOnly=false]  Specifies if a HEAD request should be done instead of a GET request.
	 * @param {string}      [args.axios.responseType]       Axios responseType.
	 * @param {Function}    [args.axios.transformResponse]  Axios transformResponse.
	 * @param {Function}    [args.axios.onDownloadProgress] Axios onDownloadProgress (browser only).
	 * @param {string}      [args.method=post]              Request method to use, either `head`, `get`, or `post`.
	 * @returns {Promise<AxiosResponse>}
	 * @throws {InvalidArgumentError}
	 */
	async downloadById(args) {
		if (!args || !args.fileId) {
			throw new InvalidArgumentError('The `fileId` parameter is required');
		}

		args.method = args.method ? args.method.toLowerCase() : 'post';

		let url = `${this._b2.authorization.downloadUrl}/b2api/${API_VERSION}/b2_download_file_by_id`;

		let params = {
			fileId:               args.fileId,
			b2ContentDisposition: args.b2ContentDisposition,
			b2ContentLanguage:    args.b2ContentLanguage,
			b2Expires:            args.b2Expires,
			b2CacheControl:       args.b2CacheControl,
			b2ContentEncoding:    args.b2ContentEncoding,
			b2ContentType:        args.b2ContentType,
			serverSideEncryption: args.method === 'get' ? JSON.stringify(args.serverSideEncryption) : undefined,
		};

		if (args.method === 'get') {
			params = URLSearchParams(params);
			url =+ params;
		}

		return await this._b2.client.request({
			url: url,
			method: args.method,
			headers: {
				Authorization: args.authorization || this._b2.authorization.authorizationToken,
				...(args.method === 'post' ? makeB2SSEHeaders(args.serverSideEncryption) : {}),
			},
			responseType: args.responseType,
			encoding: null,
			transformResponse: args.transformResponse,
			onDownloadProgress: args.onDownloadProgress,
			data: args.method === 'post' ? params : null,
		});
	}

	/**
	 * Deletes one version of a file from B2.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_delete_file_version.html}.
	 * 
	 * @b2TransactionClass A
	 * @param {object} args          Method arguments.
	 * @param {string} args.fileId   ID of the file.
	 * @param {string} args.fileName Name of the file.
	 * @returns {Promise<AxiosResponse>}
	 * @throws {InvalidArgumentError}
	 */
	async deleteVersion(args) {
		if (!args || !args.fileId) {
			throw new InvalidArgumentError('The `fileId` parameter is required');
		}

		if (!args.fileName) {
			throw new InvalidArgumentError('The `fileName` parameter is required');
		}

		return await this._b2.client.post('/b2_delete_file_version', {
			accountId: this._b2.authorization.accountId,
			fileId: args.fileId,
			fileName: args.fileName
		});
	}

	/**
	 * Deletes all versions of a file from B2.
	 * 
	 * @b2TransactionClass A
	 * @param {object} args          Method arguments.
	 * @param {string} args.bucketId ID of the bucket.
	 * @param {string} args.fileName Name of the file.
	 * @returns {number}             The number of versions deleted.
	 * @throws {InvalidArgumentError}
	 */
	async deleteAllVersions(args) {
		if (!args || !args.fileName) {
			throw new InvalidArgumentError('The `fileName` parameter is required');
		}

		if (!args.bucketId) {
			throw new InvalidArgumentError('The `bucketId` parameter is required');
		}

		let counter = 0;

		const versions = await this.listAllVersions({
			bucketId: args.bucketId,
			prefix:   args.fileName,
		});

		versions.forEach(async (version) => {
			await this.deleteFileVersion({
				fileId:   version.fileId,
				fileName: version.fileName,
			});
			counter++;
		});

		return counter;
	}

	/**
	 * Creates a new file by copying from an existing file.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_copy_file.html}.
	 * 
	 * @b2TransactionClass C
	 * @param {object}      args                                   Method arguments.
	 * @param {string}      args.sourceFileId                      ID of the source file being copied.
	 * @param {string}      args.fileName                          Name of the new file being created.
	 * @param {string}      [args.destinationBucketId]             ID of the bucket where the copied file will be stored.
	 * @param {string}      [args.range]                           Range of bytes to copy. If not provided, the whole source file will be copied.
	 * @param {string}      [args.contentType]                     MIME type of the content of the file.
	 * @param {string}      [args.fileInfo]                        Metadata that will be stored with the file.
	 * @param {B2SSEConfig} [args.sourceServerSideEncryption]      Parameters for accessing the source file data using Server-Side Encryption.
	 * @param {B2SSEConfig} [args.destinationServerSideEncryption] Parameters for encrypting the copied data before storing the destination file using Server-Side Encryption.
	 * @returns {Promise<AxiosResponse>}
	 * @throws {InvalidArgumentError}
	 */
	async copy(args) {
		if (!args || !args.sourceFileId) {
			throw new InvalidArgumentError('The `sourceFileId` parameter is required');
		}

		if (!args.fileName) {
			throw new InvalidArgumentError('The `fileName` parameter is required');
		}

		return await this._b2.client.post('/b2_copy_file', {
			sourceFileId:                    args.sourceFileId,
			fileName:                        args.fileName,
			destinationBucketId:             args.destinationBucketId,
			range:                           args.range,
			contentType:                     args.contentType,
			fileInfo:                        args.fileInfo,
			sourceServerSideEncryption:      args.sourceServerSideEncryption,
			destinationServerSideEncryption: args.destinationServerSideEncryption,
		}, {
			transformResponse: (data) => this.transformResponse(data, (data) => {
				return new File(data, this._b2);
			}),
		});
	}
}

export default FileActions;