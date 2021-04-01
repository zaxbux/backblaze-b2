/**
 * @file Defines FileActions class.
 */

import { API_VERSION, CONTENT_TYPE_AUTO } from '../constants';
import { encodeB2String, addInfoHeaders } from '../utils';
import B2Action from './base';

import { createHash } from 'crypto';

const sha1 = (value) => createHash('sha1').update(value).digest('hex');

/**
 * See {@link https://www.backblaze.com/b2/docs/server_side_encryption.html}.
 * 
 * @typedef {object} B2SSEConfig
 * @property {"SSE-C"}  mode        Either `SSE-B2` or `SSE-C`.
 * @property {"SHA256"} algorithm   Only `SHA256` is supported.
 * @property {string}   key         The AES-256 encryption key, base64-encoded.
 * @property {string}   keyMd5      The MD5 digest of the key, base64-encoded.
 */

/**
 * Methods for managing B2 files.
 * 
 * See {@link https://www.backblaze.com/b2/docs/files.html}.
 * 
 * @class
 * @public
 */
class FileActions extends B2Action {

	/**
	 * Uploads one file to B2.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_upload_file.html}.
	 * 
	 * @param {object}      args Method arguments.                       Method arguments.
	 * @param {string}      args.fileName               Name of the file.
	 * @param {string}      [args.contentType]          MIME type of the content of the file.
	 * @param {string}      [args.contentLength]        Number of bytes in the file being uploaded.
	 * @param {string}      [args.hash]                 SHA1 checksum of the content of the file.
	 * @param {B2SSEConfig} [args.serverSideEncryption] If set, B2 will encrypt the uploaded data before storing the file.
	 * @returns {AxiosResponse}
	 */
	async upload(args) {
		const fileName = encodeB2String(args.fileName);
		const b2InfoHeaders = addInfoHeaders(args.info);
		const len = args.contentLength || args.data.byteLength || args.data.length;

		return await this.b2.client.post(args.uploadUrl, {
			headers: {
				...b2InfoHeaders,
				'Authorization': args.uploadAuthToken,
				'Content-Type': args.contentType || CONTENT_TYPE_AUTO,
				'Content-Length': len,
				'X-Bz-File-Name': fileName,
				'X-Bz-Content-Sha1': args.hash || (args.data ? sha1(args.data) : null),
				'X-Bz-Server-Side-Encryption': args.serverSideEncryption.mode || null,
			},
			data: args.data,
			maxRedirects: 0,
			onUploadProgress: args.onUploadProgress || null
		});
	}

	/**
	 * Prepares for uploading the parts of a large file.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_start_large_file.html}.
	 * 
	 * @param {object} args Method arguments.
	 * @returns {AxiosResponse}
	 */
	async startLargeFile(args) {
		return await this.b2.client.post('/b2_start_large_file', {
			data: {
				bucketId: args.bucketId,
				fileName: args.fileName,
				contentType: args.contentType || CONTENT_TYPE_AUTO
			}
		});
	}

	/**
	 * Gets a URL to use for uploading parts of a large file.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_get_upload_part_url.html}.
	 * 
	 * @param {object} args Method arguments.
	 * @returns {AxiosResponse}
	 */
	async getUploadPartUrl(args) {
		return await this.b2.client.post('/b2_get_upload_part_url', {
			data: {
				fileId: args.fileId
			}
		});
	}

	/**
	 * Uploads one part of a large file to B2.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_upload_part.html}.
	 * 
	 * @param {object} args Method arguments.
	 * @returns {AxiosResponse}
	 */
	async uploadPart(args) {
		return await this.b2.client.post(args.uploadUrl, {
			headers: {
				Authorization: args.uploadAuthToken,
				'Content-Length': args.contentLength || args.data.byteLength || args.data.length,
				'X-Bz-Part-Number': args.partNumber,
				'X-Bz-Content-Sha1': args.hash || (args.data ? sha1(args.data) : null)
			},
			data: args.data,
			onUploadProgress: args.onUploadProgress || null,
			maxRedirects: 0
		});
	}

	/**
	 * Converts the parts that have been uploaded into a single B2 file.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_finish_large_file.html}.
	 * 
	 * @param {object} args Method arguments.
	 * @returns {AxiosResponse}
	 */
	async finishLargeFile(args) {
		return await this.b2.client.post('/b2_finish_large_file', {
			data: {
				fileId: args.fileId,
				partSha1Array: args.partSha1Array
			}
		});
	}

	/**
	 * Cancels the upload of a large file, and deletes all of the parts that have been uploaded.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_cancel_large_file.html}.
	 * 
	 * @param {object} args Method arguments.
	 * @returns {AxiosResponse}
	 */
	async cancelLargeFile(args) {
		return await this.b2.client.post('/b2_cancel_large_file', {
			data: {
				fileId: args.fileId
			}
		});
	}

	/**
	 * Lists the names of all files in a bucket.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_list_file_names.html}.
	 * 
	 * @param {object} args Method arguments.
	 * @returns {AxiosResponse}
	 */
	async listNames(args) {
		const bucketId = args.bucketId;
		const startFileName = args.startFileName;
		const maxFileCount = args.maxFileCount;
		const prefix = args.prefix;
		const delimiter = args.delimiter;

		return await this.b2.client.post('/b2_list_file_names', {
			data: {
				bucketId,
				startFileName: startFileName || '',
				maxFileCount: maxFileCount || 100,
				prefix: prefix || '',
				delimiter: delimiter || null
			}
		});
	}

	/**
	 * Lists all of the versions of all of the files contained in one bucket.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_list_file_versions.html}.
	 * 
	 * @async
	 * @param {object} args Method arguments.
	 * @returns {AxiosResponse}
	 */
	async listVersions(args) {
		return await this.b2.client.post('/b2_list_file_versions', {
			data: {
				bucketId:      args.bucketId,
				startFileId:   args.startFileId,
				startFileName: args.startFileName || '',
				maxFileCount:  args.maxFileCount || 1000,
				prefix:        args.prefix || '',
			}
		});
	}

	/**
	 * Lists the parts that have been uploaded for a large file that has not been finished yet.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_list_parts.html}.
	 * 
	 * @async
	 * @param {object} args Method arguments.
	 * @returns {AxiosResponse}
	 */
	async listParts(args) {
		return await this.b2.client.post('/b2_list_parts', {
			data: {
				fileId: args.fileId,
				startPartNumber: args.startPartNumber || 0,
				maxPartCount: args.maxPartCount || 100
			}
		});
	}

	/**
	 * Hides a file so that downloading by name will not find the file.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_hide_file.html}.
	 * 
	 * @param {object} args Method arguments.
	 * @returns {AxiosResponse}
	 */
	async hide(args) {
		const bucketId = args.bucketId;
		const fileName = args.fileName;

		return await this.b2.client.post('/b2_hide_file', {
			data: {
				bucketId: bucketId,
				fileName: fileName
			}
		});
	}

	/**
	 * Gets information about one file stored in B2.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_get_file_info.html}.
	 * 
	 * @param {object} args        Method arguments.
	 * @param {string} args.fileId ID of the file.
	 * @returns {AxiosResponse}
	 */
	async getInfo(args) {
		return await this.b2.client.post('/b2_get_file_info', {
			data: {
				fileId: args.fileId
			}
		});
	}

	/**
	 * Used to generate an authorization token that can be used to download files.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_get_download_authorization.html}.
	 * 
	 * @param {object} args Method arguments.
	 * @returns {AxiosResponse}
	 */
	async getDownloadAuthorization(args) {
		return await this.b2.client.post('/b2_get_download_authorization', {
			data: {
				bucketId: args.bucketId,
				fileNamePrefix: args.fileNamePrefix,
				validDurationInSeconds: args.validDurationInSeconds,
				b2ContentDisposition: args.b2ContentDisposition
			}
		});
	}

	/**
	 * Downloads one file by providing the name of the bucket and the name of the file.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_download_file_by_name.html}.
	 * 
	 * @param {object} args Method arguments.
	 * @returns {AxiosResponse}
	 */
	async downloadByName(args) {
		const fileName = encodeB2String(args.fileName);

		return await this.b2.client.get(`${this.b2.authorization.downloadUrl}/file/${args.bucketName}/${fileName}`, {
			responseType: args.responseType || null,
			encoding: null,
			transformResponse: args.transformResponse || null,
			onDownloadProgress: args.onDownloadProgress || null
		});
	}

	/**
	 * Downloads one file.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_download_file_by_id.html}.
	 * 
	 * @param {object} args Method arguments.
	 * @returns {AxiosResponse}
	 */
	async downloadById(args) {
		return await this.b2.client.get(`${this.b2.authorization.downloadUrl}/b2api/${API_VERSION}/b2_download_file_by_id?fileId=${args.fileId}`, {
			responseType: args.responseType || null,
			encoding: null,
			transformResponse: args.transformResponse || null,
			onDownloadProgress: args.onDownloadProgress || null
		});
	}

	/**
	 * Deletes one version of a file from B2.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_delete_file_version.html}.
	 * 
	 * @param {object} args Method arguments.
	 * @returns {AxiosResponse}
	 */
	async deleteVersion(args) {
		return await this.b2.client.post('/b2_delete_file_version', {
			data: {
				accountId: this.b2.authorization.accountId,
				fileId: args.fileId,
				fileName: args.fileName
			}
		});
	}

	/**
	 * Deletes all versions of a file from B2.
	 * 
	 * @async
	 * @param {object} args          Method arguments.
	 * @param {string} args.bucketId ID of the bucket.
	 * @param {string} args.fileName Name of the file.
	 * @returns {number}
	 */
	async delete(args) {
		let counter = 0;

		const response = await this.listFileVersions({
			bucketId: args.bucketId,
			prefix: args.fileName,
		});

		response.data.files.forEach(async (file) => {
			await this.deleteFileVersion({
				fileId: file.fileId,
				fileName: args.fileName,
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
	 * @param {object}      args                                   Method arguments.
	 * @param {string}      args.sourceFileId                      ID of the source file being copied.
	 * @param {string}      args.fileName                          Name of the new file being created.
	 * @param {string}      [args.destinationBucketId]             ID of the bucket where the copied file will be stored.
	 * @param {string}      [args.range]                           Range of bytes to copy. If not provided, the whole source file will be copied.
	 * @param {string}      [args.contentType]                     MIME type of the content of the file.
	 * @param {string}      [args.fileInfo]                        Metadata that will be stored with the file.
	 * @param {B2SSEConfig} [args.sourceServerSideEncryption]      Parameters for accessing the source file data using Server-Side Encryption.
	 * @param {B2SSEConfig} [args.destinationServerSideEncryption] Parameters for encrypting the copied data before storing the destination file using Server-Side Encryption.
	 * @returns {AxiosResponse}
	 */
	async copy(args) {
		return await this.b2.client.post('/b2_copy_file', {
			data: {
				sourceFileId: args.sourceFileId,
			}
		});
	}
}

export default FileActions;