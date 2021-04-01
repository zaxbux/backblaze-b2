/**
 * @file Contains tests for the B2 API SDK.
 */

import { expect } from 'chai';
import nock from 'nock';
import B2 from '../../lib/b2';
import { API_VERSION } from '../../lib/constants';
import nock_response from './authorize.json';
import { CAPABILITIES as KEY_CAPABILITIES } from '../../lib/actions/key';

describe('B2 -> authorize()', function () {
	beforeEach(function () {
		this.b2 = new B2({
			applicationKeyId: '000000000000bb00000000000',
			applicationKey: 'abcdefghijklmnopqrstuvwxyz01234',
		});

		this._nock = nock(`https://api.backblazeb2.com/b2api/${API_VERSION}`)
			.get(nock_response._path);
	});

	afterEach(function () {
		nock.cleanAll();
	});

	it('should receive an HTTP 200 response', async function () {
		this._nock.reply(nock_response.success.status, nock_response.success.data);

		const response = await this.b2.authorize();

		expect(response.status).to.equal(200);
	});

	it('should fetch an authorization token', async function () {
		this._nock.reply(nock_response.success.status, nock_response.success.data);

		const response = await this.b2.authorize();

		expect(response.data).to.have.all.keys(
			'accountId',
			'authorizationToken',
			'allowed',
			'apiUrl',
			'downloadUrl',
			'recommendedPartSize',
			'absoluteMinimumPartSize',
		);
	});

	it('should have a bucket restriction', async function () {
		this._nock.reply(nock_response.bucket_restriction.status, nock_response.bucket_restriction.data);

		const response = await this.b2.authorize();

		expect(response.data.allowed.bucketId).to.equal('12345');
		expect(response.data.allowed.bucketName).to.equal('my_bucket');
	});

	it('should not have a listKeys capability', async function () {
		this._nock.reply(nock_response.bucket_restriction.status, nock_response.bucket_restriction.data);

		const response = await this.b2.authorize();

		expect(response.data.allowed.capabilities).does.not.contain(KEY_CAPABILITIES.LIST_KEYS);
	});
});
