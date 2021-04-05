/**
 * Base class for a B2 API action.
 * 
 * @param {B2} b2 Instance of the B2 API client.
 */
class B2Action {
	constructor(b2) {
		/**
		 * @type {B2}
		 * @private
		 */
		this._b2 = b2;
	}

	/**
	 * Attempt to parse a string as JSON and return the resulting object, otherwise return the original data.
	 * 
	 * @static
	 * @param {*} data Data to attempt to parse as JSON.
	 * @returns {object}
	 */
	static parseJSON(data) {
		var result = data;
		if (typeof result === 'string' && result.length) {
			try {
				result = JSON.parse(result);
			} catch (e) { /* Ignore */ }
		}
		return result;
	}

	/**
	 * Transforms a response if it can be parsed into a JSON object, otherwise returns the original response.
	 * 
	 * @param {*}        data     Response data.
	 * @param {Function} callback Callback used to transform the response.
	 * @returns {*}
	 */
	transformResponse(data, callback) {
		// Must try to parse JSON manually, since the default axios method was overridden
		data = B2Action.parseJSON(data);

		// Don't deserialize the response data if explicitly disabled
		if (!this._b2.options.hydrate) {
			return data;
		}

		// Skip deserialization if response data isn't an object
		if (typeof data !== 'object') {
			return data;
		}

		return callback(data);
	}
}

export default B2Action;