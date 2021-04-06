/**
 * @file Contains the methods for managing Large Files.
 */

import { CONTENT_TYPE_AUTO } from '../constants';
import { InvalidArgumentError } from '../errors';
import { createSHA1Checksum, getContentLength, makeB2SSEHeaders } from '../utils';
import B2Action from './base';

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
class LargeFileActions extends B2Action {

	/**
	 * Prepares for uploading the parts of a large file.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_start_large_file.html}.
	 * 
	 * @b2TransactionClass A
	 * @param {object}                  args                        Method arguments.
	 * @param {string}                  args.bucketId               ID of the bucket that the file will go in.
	 * @param {string}                  args.fileName               Name of the file.
	 * @param {string}                  [args.contentType]          MIME type of the content of the file, defaults to b2/x-auto.
	 * @param {object.<string, string>} [args.fileInfo]             Custom information metadata to store with the file.
	 * @param {B2SSEConfig}             [args.serverSideEncryption] If set, B2 will encrypt the uploaded data before storing the file.
	 * @returns {Promise<AxiosResponse>}
	 * @throws {InvalidArgumentError}
	 */
	async start(args) {
		if (!args || !args.bucketId) {
			throw new InvalidArgumentError('The `bucketId` parameter is required');
		}

		if (!args.fileName) {
			throw new InvalidArgumentError('The `fileName` parameter is required');
		}

		return await this._b2.client.post('/b2_start_large_file', {
			bucketId:             args.bucketId,
			fileName:             args.fileName,
			contentType:          args.contentType || CONTENT_TYPE_AUTO,
			fileInfo:             args.fileInfo,
			serverSideEncryption: args.serverSideEncryption,
		});
	}

	/**
	 * Gets a URL to use for uploading parts of a large file.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_get_upload_part_url.html}.
	 * 
	 * @b2TransactionClass A
	 * @param {object} args        Method arguments.
	 * @param {string} args.fileId ID of the large file whose parts you want to upload.
	 * @returns {Promise<AxiosResponse>}
	 * @throws {InvalidArgumentError}
	 */
	async getUploadPartUrl(args) {
		if (!args || !args.fileId) {
			throw new InvalidArgumentError('The `fileId` parameter is required');
		}

		return await this._b2.client.post('/b2_get_upload_part_url', {
			fileId: args.fileId
		});
	}

	/**
	 * Uploads one part of a large file to B2.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_upload_part.html}.
	 * 
	 * @b2TransactionClass A
	 * @param {object}      args                        Method arguments.
	 * @param {string}      args.uploadUrl              URL of the upload destination.
	 * @param {string}      args.authorizationToken     Upload authorization token.
	 * @param {number}      args.partNumber             Part number.
	 * @param {*}           args.data                   Data to upload.
	 * @param {number}      [args.contentLength]        Number of bytes in the file being uploaded, will be calculated if not provided.
	 * @param {string}      [args.hash]                 SHA1 checksum of the content of the file, will be calculated if not provided.
	 * @param {B2SSEConfig} [args.serverSideEncryption] Required if the file was started with parameters specifying customer-managed encryption keys.
	 * @param {Function}    [args.onUploadProgress]     A callback to pass to Axios `onUploadProgress`.
	 * @returns {Promise<AxiosResponse>}
	 * @throws {InvalidArgumentError}
	 */
	async uploadPart(args) {
		if (!args || !args.uploadUrl) {
			throw new InvalidArgumentError('The `uploadUrl` parameter is required');
		}

		if (!args.authorizationToken) {
			throw new InvalidArgumentError('The `authorizationToken` parameter is required');
		}

		if (!args.partNumber) {
			throw new InvalidArgumentError('The `partNumber` parameter is required');
		}

		if (!args.data) {
			throw new InvalidArgumentError('The `data` parameter is required');
		}

		return await this._b2.client.post(args.uploadUrl, args.data, {
			headers: {
				'Authorization':     args.authorizationToken,
				'Content-Length':    args.contentLength || getContentLength(args.data),
				'X-Bz-Part-Number':  args.partNumber,
				'X-Bz-Content-Sha1': args.hash || createSHA1Checksum(args.data),
				...(args.serverSideEncryption ? makeB2SSEHeaders(args.serverSideEncryption) : {}),
			},
			maxRedirects: 0,
			onUploadProgress: args.onUploadProgress,
		});
	}

	/**
	 * Converts the parts that have been uploaded into a single B2 file.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_finish_large_file.html}.
	 * 
	 * @b2TransactionClass A
	 * @param {object}   args               Method arguments.
	 * @param {string}   args.fileId        ID of the large file to finalize.
	 * @param {string[]} args.partSha1Array An array of hex SHA1 checksums of the parts of the large file.
	 * @returns {Promise<AxiosResponse>}
	 * @throws {InvalidArgumentError}
	 */
	async finish(args) {
		if (!args || !args.fileId) {
			throw new InvalidArgumentError('The `fileId` parameter is required');
		}

		if (!args.partSha1Array) {
			throw new InvalidArgumentError('The `partSha1Array` parameter is required');
		}

		return await this._b2.client.post('/b2_finish_large_file', {
			fileId:        args.fileId,
			partSha1Array: args.partSha1Array,
		});
	}

	/**
	 * Cancels the upload of a large file, and deletes all of the parts that have been uploaded.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_cancel_large_file.html}.
	 * 
	 * @b2TransactionClass A
	 * @param {object} args        Method arguments.
	 * @param {string} args.fileId ID of the large file to cancel.
	 * @returns {Promise<AxiosResponse>}
	 * @throws {InvalidArgumentError}
	 */
	async cancel(args) {
		if (!args || !args.fileId) {
			throw new InvalidArgumentError('The `fileId` parameter is required');
		}

		return await this._b2.client.post('/b2_cancel_large_file', {
			fileId: args.fileId,
		});
	}

	/**
	 * Lists the parts that have been uploaded for a large file that has not been finished yet.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_list_parts.html}.
	 * 
	 * @b2TransactionClass C
	 * @param {object} args                     Method arguments.
	 * @param {string} args.fileId              File whose parts will be listed.
	 * @param {number} [args.startPartNumber]   First part to return.
	 * @param {number} [args.maxPartCount=1000] Maximum number of parts to return.
	 * @returns {Promise<AxiosResponse>}
	 * @throws {InvalidArgumentError}
	 */
	async listParts(args) {
		if (!args || !args.fileId) {
			throw new InvalidArgumentError('The `fileId` parameter is required');
		}

		return await this._b2.client.post('/b2_list_parts', {
			fileId:          args.fileId,
			startPartNumber: args.startPartNumber || 0,
			maxPartCount:    args.maxPartCount    || 1000
		});
	}

	/**
	 * Lists all of the parts that have been uploaded for a large file that has not been finished yet.
	 * 
	 * @see B2#listParts
	 * 
	 * @b2TransactionClass C
	 * @param {object} [args] Method arguments.
	 * @returns {Array<object>}
	 */
	async listAllParts(args) {
		const parts = [];
		let startPartNumber = args.startPartNumber;

		while (startPartNumber !== null) {
			const response = this.listParts({...args, startPartNumber: startPartNumber});

			parts.concat(response.data.parts);

			startPartNumber = response.data.nextPartNumber;
		}

		return parts;
	}

	/**
	 * @b2TransactionClass C
	 * @param {object}      args
	 * @param {string}      args.sourceFileId
	 * @param {string}      args.largeFileId
	 * @param {string}      args.partNumber
	 * @param {string}      [args.range]
	 * @param {B2SSEConfig} [args.sourceServerSideEncryption]
	 * @param {B2SSEConfig} [args.destinationServerSideEncryption]
	 */
	async copyPart(args) {
		if (!args || !args.sourceFileId) {
			throw new InvalidArgumentError('The `sourceFileId` parameter is required');
		}

		if (!args.largeFileId) {
			throw new InvalidArgumentError('The `largeFileId` parameter is required');
		}

		if (!args.partNumber) {
			throw new InvalidArgumentError('The `partNumber` parameter is required');
		}

		return await this._b2.post('/b2_copy_part', {
			sourceFileId:                    args.sourceFileId,
			largeFileId:                     args.largeFileId,
			partNumber:                      args.partNumber,
			range:                           args.range,
			sourceServerSideEncryption:      args.sourceServerSideEncryption,
			destinationServerSideEncryption: args.destinationServerSideEncryption,
		});
	}
}

export default LargeFileActions;