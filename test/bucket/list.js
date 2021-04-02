/**
 * @file Contains tests for the B2 API SDK.
 */

import { expect } from 'chai';
import nock from 'nock';
import B2 from '../../lib/b2';
import { API_VERSION } from '../../lib/constants';
import nock_response from './list.json';

const API_URL = 'https://api.backblazeb2.com';

describe('B2 -> Bucket -> list()', function () {
	beforeEach(function (done) {
		this.b2 = new B2({
			applicationKeyId: '000000000000bb00000000000',
			applicationKey: 'abcdefghijklmnopqrstuvwxyz01234',
		}, {
			authorization: {
				apiUrl: API_URL,
			}
		});

		this._nock = nock(`${API_URL}/b2api/${API_VERSION}`)
			.get(nock_response._path);
		
		done();
	});

	afterEach(function () {
		nock.cleanAll();
	});

	it.skip('should receive an HTTP 200 response', async function (done) {
		this._nock.reply(nock_response.success.status, nock_response.success.data);

		const response = await this.b2.authorize();

		expect(response.status).to.equal(200);

		done();
	});
});
