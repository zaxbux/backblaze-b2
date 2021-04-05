import { use as chai_use, expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import nock from 'nock';
import B2 from '../lib/b2';
import { API_BASE_URL, API_VERSION } from '../lib/constants';
import Key from '../lib/key';
import nock_responses from './fixtures/key.json';

chai_use(chaiAsPromised);

describe('key', function () {

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
		it('should have the applicationKey property set', async function() {
			_nock.post('/b2_create_key').reply(200, nock_responses.create);

			const key = new Key({
				keyName: 'my_key',
				capabilities: [
					'listKeys',
				],
			});

			key.bindClient(_b2);

			expect((await key.create()).applicationKey).to.equal('xyz');
		});
	});

	describe('delete()', function () {
		it('should return true', async function() {
			_nock.post('/b2_delete_key').reply(200, nock_responses.delete);

			const key = new Key({
				applicationKeyId: '123',
			});

			key.bindClient(_b2);

			expect(await key.delete()).to.equal(true);
		});
	});
	
});