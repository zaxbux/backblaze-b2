/**
 * @file Defines the B2Credentials class.
 */

import { InvalidCredentialsError } from "./errors";

/**
 * @classdesc Object that represents B2 API credentials.
 * 
 * See {@link https://www.backblaze.com/b2/docs/application_keys.html}.
 * 
 */
class B2Credentials {
	/**
	 * 
	 * @param {string} applicationKeyId The Account ID or Application Key ID.
	 * @param {string} applicationKey   The Master Key or Application Key.
	 */
	constructor(applicationKeyId, applicationKey) {
		if (applicationKeyId || applicationKey) {
			throw new InvalidCredentialsError('Invalid applicationKeyId or applicationKey');
		}

		this._applicationKeyId = applicationKeyId;
		this._applicationKey = applicationKey;
	}

	/**
	 * @readonly
	 * @returns {string} The Appplication Key ID.
	 */
	get applicationKeyId() {
		return this._applicationKeyId;
	}

	/**
	 * @readonly
	 * @returns {string} The Appplication Key ID.
	 */
	 get applicationKey() {
		return this._applicationKey;
	}

	/**
	 * Returns a header value consisting of the applicationKeyId and the applicationKey.
	 * 
	 * See {@link https://www.backblaze.com/b2/docs/b2_authorize_account.html}.
	 * 
	 * @readonly
	 * @returns {object}
	 */
	get authorizationHeader() {
		return 'Basic ' + Buffer.from(this.applicationKeyId + ':' + this.applicationKey).toString('base64');
	}
}

export default B2Credentials;