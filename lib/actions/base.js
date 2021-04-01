/**
 * @file Defines interface for a B2 action class.
 */

import B2 from '../b2';

/**
 * @class
 * @public
 * @param {B2} b2 Instance of the B2 class.
 */
class B2Action {
	constructor(b2) {
		/**
		 * @type {B2}
		 * @private
		 */
		this.b2 = b2;
	}
}

export default B2Action;