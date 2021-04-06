import B2 from './b2';
import { B2Error } from './errors';

/**
 * Construct a new instance of a B2 Object.
 * 
 * @class
 * @classdesc Base class for B2 objects returned from the API.
 * @param {object} [init] Data to initialize this object with.
 * @param {B2}     [b2]   Instance of the B2 API client.
 */
export class B2Object {
	constructor(init, b2) {
		if (init) {
			Object.assign(this, init);
		}

		/**
		 * @type {B2}
		 */
		this._b2 = b2;
	}

	/**
	 * Bind an instance of this object to the B2 API client.
	 * 
	 * @param {B2} b2 Instance of the B2 API client.
	 * @returns {B2Object}
	 */
	bindClient(b2) {
		this._b2 = b2;

		return this;
	}

	/**
	 * Checks this instance to see if a B2 API client as been attached.
	 * 
	 * @returns {boolean}
	 * @throws {B2Error}
	 */
	checkClient() {
		if (this._b2 instanceof B2) {
			if (!this._b2.authorization || !this._b2.authorization.authorizationToken) {
				throw new B2Error('Client instance not authorized');
			}

			return true;
		}

		throw new B2Error('Client instance not bound');
	}

	/**
	 * Serialize this object into a JSON string.
	 * 
	 * @returns {string}
	 */
	toString() {
		return JSON.stringify(this);
	}
}

export default B2Object;