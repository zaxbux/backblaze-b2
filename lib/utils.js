/**
 * @file Defines utility functions.
 */

import { AxiosRequestConfig } from 'axios';
import { MAX_INFO_HEADERS } from './constants';
import { B2Credentials } from './b2';
import { InvalidCredentialsError } from './errors';

/**
 * Returns a header consisting of the accountId or applicationKeyId, and the applicationKey.
 * 
 * @param {B2Credentials} credentials B2 API credentials.
 * @returns {object}
 * @throws {InvalidCredentialsError}
 */
export function getAccountAuthorizationHeader(credentials) {
	if (!credentials.applicationKeyId) {
		throw new InvalidCredentialsError('Invalid applicationKeyId');
	}
	
	if (!credentials.applicationKey) {
		throw new InvalidCredentialsError('Invalid applicationKey');
	}

	return 'Basic ' + Buffer.from(credentials.applicationKeyId + ':' + credentials.applicationKey).toString('base64');
}

/**
 * Encode unicode characters in a way that the B2 API expects.
 * 
 * See {@link https://www.backblaze.com/b2/docs/string_encoding.html}.
 * 
 * @param {string} string String to encode.
 * @returns {*}
 */
export function encodeB2String(string) {
	return string.split('/').map(encodeURIComponent).join('/');
}

/**
 * 
 * @param {AxiosRequestConfig}     options  Axios request config.
 * @param {object<string, string>} info     Info to add.
 * @throws {Error}
 */
export function addInfoHeaders(options, info) {
	let invalidKeys = [];
	if (info) {
		let keys = Object.keys(info);

		if (keys.length > MAX_INFO_HEADERS) {
			throw new Error(`Too many info headers: maximum of ${MAX_INFO_HEADERS} allowed`);
		}

		keys.forEach(addInfoHeader);

		if (invalidKeys.length) {
			throw new Error('Info header keys contain invalid characters: ' + invalidKeys.join('   '));
		}
	}

	/**
	 * @param {string} header Header.
	 * @returns {string}
	 */
	function isValidHeader(header) {
		return /^[a-z0-9-_]+$/i.test(header);
	}

	/**
	 * @param {string} infoKey Info key.
	 * @returns {number | void}
	 */
	function addInfoHeader(infoKey) {
		if (isValidHeader(infoKey)) {
			const key = 'X-Bz-Info-' + infoKey;
			options.headers[key] = encodeURIComponent(info[infoKey]);
		} else {
			return invalidKeys.push(infoKey);
		}
	}
}

/**
 * 
 * @param {object<string, string>} headers   B2 info headers to add.
 * @param {object}                 targetObj Target object.
 * @returns {*}
 */
export function addBzHeaders(headers, targetObj) {
	const keys = Object.keys(headers);

	return keys.filter(isBzHeader)
		.map(getKeyObj)
		.map(setKeyValue);

	/**
	 * @param {string} header Header.
	 * @returns {boolean}
	 */
	function isBzHeader(header) {
		return /^X-Bz-/i.test(header);
	}

	/**
	 * @param {string} header Header.
	 * @returns {object}
	 */
	function getKeyObj(header) {
		const replacement = /^X-Bz-Info-/i.test(header) ? /X-Bz-Info-/i : /X-Bz-/i;
		return {
			original: header,
			header: camelCase(header.replace(replacement, ''))
		};
	}

	/**
	 * @param {string} headerObj Header obj.
	 */
	function setKeyValue(headerObj) {
		targetObj[headerObj.header] = headers[headerObj.original];
	}

	/**
	 * @param {string} header Header.
	 * @returns {string}
	 */
	function camelCase(header) {
		return header.split('-')
			.map(firstLetterCapitalise)
			.join('');
	}

	/**
	 * 
	 * @param {string} word Word.
	 * @param {number} index Index.
	 * @returns {string}
	 */
	function firstLetterCapitalise(word, index) {
		if (index === 0) { // skip first letter
			return word;
		}
		return word[0].toUpperCase() + word.substr(1);
	}
}
