/**
 * @file Contains tests for key actions.
 */

import { use as chai_use, expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import nock from 'nock';
import B2 from '../../lib/b2';
import { API_BASE_URL, API_VERSION } from '../../lib/constants';
import { InvalidArgumentError } from '../../lib/errors';
import Key from '../../lib/key';
import nock_responses from './key.json';

chai_use(chaiAsPromised);

describe('actions/key', function () {

	let _nock, _b2;

	beforeEach(async function () {
		_nock = nock(`${API_BASE_URL}/b2api/${API_VERSION}`)
			.get('/b2_authorize_account')
			.reply(200, {
				accountId: '000123456789',
				authorizationToken: 'abc',
				allowed: {
					capabilities: [
						'listKeys',
						'writeKeys',
						'deleteKeys',
						'listBuckets',
						'writeBuckets',
						'deleteBuckets',
						'listFiles',
						'readFiles',
						'shareFiles',
						'writeFiles',
						'deleteFiles',
					],
				},
				apiUrl: API_BASE_URL,
				downloadUrl: API_BASE_URL,
				recommendedPartSize: 10000,
				absoluteMinimumPartSize: 500,
			});

		_b2 = new B2({
			applicationKeyId: '000000000000bb00000000000',
			applicationKey: 'abcdefghijklmnopqrstuvwxyz01234',
		});

		await _b2.authorize();
	});

	afterEach(function (done) {
		nock.cleanAll();
		done();
	});

	describe('create()', function () {
		const args = {
			keyName: 'my_key',
			capabilities: [
				'listKeys'
			]
		};

		it('should throw InvalidArgumentError when missing `keyName`', async function() {
			await expect(_b2.key.create()).to.be.rejectedWith(InvalidArgumentError, 'The `keyName` parameter is required');
			await expect(_b2.key.create({})).to.be.rejectedWith(InvalidArgumentError, 'The `keyName` parameter is required');
		});

		it('should throw InvalidArgumentError when missing `capabilities`', async function() {
			await expect(_b2.key.create({
				keyName: 'my_key',
			})).to.be.rejectedWith(InvalidArgumentError, 'The `capabilities` parameter is required');
		});
	
		it('should have the listKeys capability', async function () {
			_nock.post('/b2_create_key').reply(200, nock_responses.create);

			const response = await _b2.key.create(args);
	
			expect(response.data.capabilities).is.an('array').that.contains('listKeys');
		});
	});
	
	describe('list()', function () {
		const args = {
			keyName: 'my_key',
			capabilities: [
				'listKeys'
			]
		};
	
		it('should have an array of Key objects', async function () {
			_nock.post('/b2_list_keys').reply(200, nock_responses.list);

			const response = await _b2.key.list(args);
	
			expect(response.data.keys).to.be.an('array');
			
			response.data.keys.forEach((v, i) => {
				expect(v instanceof Key, `keys[${i}] is not of type 'Key'`);
			});

			expect(response.data.keys).to.be.an('array');
			expect(response.data.keys[1].canListKeys()).to.equal(true);
		});
	});

	describe('listAll()', function () {
		it('should combine two requests into one response', async function () {
			_nock
				.post('/b2_list_keys').reply(200, nock_responses.listAll1)
				.post('/b2_list_keys').reply(200, nock_responses.listAll2);

			const response = await _b2.key.listAll();
	
			expect(response).to.be.an('array').of.length(2);
			expect(response[1].keyName).to.equal('my_key2');
		});
	});
	
	describe('delete()', function () {
		const args = {
			applicationKeyId: '1234abcd'
		};
	
		it('should receive the correct accountId', async function () {
			_nock.post('/b2_delete_key').reply(200, nock_responses.delete);

			const response = await _b2.key.delete(args);
	
			expect(response.data.accountId).to.equal('000000000000');
		});

		it('should throw InvalidArgumentError when missing `applicationKeyId`', async function() {
			await expect(_b2.key.delete()).to.be.rejectedWith(InvalidArgumentError, 'The `applicationKeyId` parameter is required');
			await expect(_b2.key.delete({})).to.be.rejectedWith(InvalidArgumentError, 'The `applicationKeyId` parameter is required');
		});
	});
});