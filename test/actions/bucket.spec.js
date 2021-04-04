/**
 * @file Contains tests for bucket actions.
 */

import { use as chai_use, expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import nock from 'nock';
import B2 from '../../lib/b2';
import { API_BASE_URL, API_VERSION } from '../../lib/constants';
import nock_responses from './bucket.json';
import auth_responses from '../b2/authorize.json';
import { DuplicateBucketNameError, InvalidArgumentError, TooManyBucketsError } from '../../lib/errors';

chai_use(chaiAsPromised);

describe('actions/bucket', function () {
	
	let _nock, _b2;

	beforeEach(async function() {
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
	
	afterEach(function(done) {
		nock.cleanAll();
		done();
	});

	describe('create()', function () {
		const args = {
			bucketName: 'my_bucket',
			bucketType: 'allPublic',
		};

		it('should throw an InvalidArgumentError when called without bucketName or bucketType', async function() {
			await expect(_b2.bucket.create()).to.be.rejectedWith(InvalidArgumentError, 'The `bucketName` parameter is required');
			await expect(_b2.bucket.create({})).to.be.rejectedWith(InvalidArgumentError, 'The `bucketName` parameter is required');
			await expect(_b2.bucket.create({
				bucketName: 'my_bucket',
			})).to.be.rejectedWith(InvalidArgumentError, 'The `bucketType` parameter is required');
		});

		it('should receive the ID of the new bucket', async function () {
			_nock.post('/b2_create_bucket').reply(200, nock_responses.create);

			const response = await _b2.bucket.create(args);

			expect(response.data.bucketId).to.equal('12345');
		});

		it('should throw a TooManyBucketsError', async function() {
			_nock.post('/b2_create_bucket').reply(400, {
				status: 400,
				code: 'too_many_buckets',
				message: '',
			});

			await expect(_b2.bucket.create(args)).to.be.rejectedWith(TooManyBucketsError);
		});

		it('should throw a DuplicateBucketNameError', async function() {
			_nock.post('/b2_create_bucket').reply(400, {
				status: 400,
				code: 'duplicate_bucket_name',
				message: '',
			});

			await expect(_b2.bucket.create(args)).to.be.rejectedWith(DuplicateBucketNameError);
		});
	});

	describe('delete()', function () {
		const args = {
			bucketId: '12345',
		};

		it('should throw an InvalidArgumentError when called without bucketId', async function() {
			await expect(_b2.bucket.delete()).to.be.rejectedWith(InvalidArgumentError, 'The `bucketId` parameter is required');
			await expect(_b2.bucket.delete({})).to.be.rejectedWith(InvalidArgumentError, 'The `bucketId` parameter is required');
		});

		it('should receive the ID of the deleted bucket', async function () {
			_nock.post('/b2_delete_bucket').reply(200, {
				bucketId: '12345',
			});

			const response = await _b2.bucket.delete(args);

			expect(response.data.bucketId).to.equal('12345');
		});
	});

	describe('update()', function () {
		const args = {
			bucketId: '12345',
		};

		it('should throw an InvalidArgumentError when called without bucketId', async function() {
			await expect(_b2.bucket.update()).to.be.rejectedWith(InvalidArgumentError, 'The `bucketId` parameter is required');
			await expect(_b2.bucket.update({})).to.be.rejectedWith(InvalidArgumentError, 'The `bucketId` parameter is required');
		});

		it('should receive the updated info of the bucket', async function () {
			_nock.post('/b2_update_bucket').reply(200, nock_responses.update);

			const response = await _b2.bucket.update(args);

			expect(response.data.bucketType).to.equal('allPrivate');
		});
	});

	describe('list()', function () {
		it('should receive an array of buckets', async function () {
			_nock.post('/b2_list_buckets').reply(200, nock_responses.list);

			const response = await _b2.bucket.list();

			expect(response.data.buckets).to.be.an('array');
		});
	});

	describe('get()', function () {
		const args = {
			bucketName: 'my_bucket',
		};

		it('should throw an InvalidArgumentError when called without bucketId or bucketName', async function() {
			await expect(_b2.bucket.get()).to.be.rejectedWith(InvalidArgumentError, 'Either the `bucketId` or `bucketName` parameter is required');
			await expect(_b2.bucket.get({})).to.be.rejectedWith(InvalidArgumentError, 'Either the `bucketId` or `bucketName` parameter is required');
		});

		it('should throw an InvalidArgumentError when called with bucketId and bucketName', async function() {
			await expect(_b2.bucket.get({
				bucketId: '12345',
				bucketName: 'my_bucket',
			})).to.be.rejectedWith(InvalidArgumentError, 'Cannot specify both `bucketId` and `bucketName` parameters');
		});

		it('should receive the ID of the bucket', async function () {
			_nock.post('/b2_list_buckets').reply(200, nock_responses.list);

			const response = await _b2.bucket.get(args);

			expect(response.bucketId).to.equal('12345');
		});

		it('should return null on non-existent bucket', async function () {
			_nock.post('/b2_list_buckets').reply(200, {
				buckets: [],
			});

			const response = await _b2.bucket.get({
				bucketName: 'not_found',
			});

			expect(response).is.equal(null);
		});
	});

	describe('getUploadUrl()', function () {
		const args = {
			bucketId: '12345',
		};

		it('should throw an InvalidArgumentError when called without bucketId', async function() {
			await expect(_b2.bucket.getUploadUrl()).to.be.rejectedWith(InvalidArgumentError, 'The `bucketId` parameter is required');
			await expect(_b2.bucket.getUploadUrl({})).to.be.rejectedWith(InvalidArgumentError, 'The `bucketId` parameter is required');
		});

		it('should receive the upload URL', async function () {
			_nock.post('/b2_get_upload_url').reply(200, nock_responses.upload_url);

			const response = await _b2.bucket.getUploadUrl(args);

			expect(response.data.uploadUrl).to.equal('https://pod-000-0000-00.backblaze.com/b2api/v2/b2_upload_file?cvt=c0_v0_t0&bucket=12345');
		});

		it('should receive the authorization token', async function () {
			_nock.post('/b2_get_upload_url').reply(200, nock_responses.upload_url);

			const response = await _b2.bucket.getUploadUrl(args);

			expect(response.data.authorizationToken).to.equal('abcdef');
		});

		it('should not fail with a bad authorization token', async function() {
			_nock.post('/b2_get_upload_url').reply(401, {
				status: 401,
				code: 'bad_auth_token',
				message: ''
			})
				.get('/b2_authorize_account').reply(200, auth_responses.success.data)
				.post('/b2_get_upload_url').reply(200, nock_responses.upload_url);

			const response = await _b2.bucket.getUploadUrl(args);

			expect(response.data).to.have.all.keys(
				'bucketId',
				'uploadUrl',
				'authorizationToken',
			);
		});

		it('should not fail with an expired auth token', async function() {
			_nock.post('/b2_get_upload_url').reply(401, {
				status: 401,
				code: 'expired_auth_token',
				message: ''
			})
				.get('/b2_authorize_account').reply(200, auth_responses.success.data)
				.post('/b2_get_upload_url').reply(200, nock_responses.upload_url);

			const response = await _b2.bucket.getUploadUrl(args);

			expect(response.data).to.have.all.keys(
				'bucketId',
				'uploadUrl',
				'authorizationToken',
			);
		});
	});
});