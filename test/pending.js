/**
 * @file Contains stub tests for the B2 API SDK.
 */

import { expect } from 'chai';

describe('B2 -> Bucket -> create()', function () {
	const args = {};

	it.skip('should receive an HTTP 200 response', async function () {
		const response = await this.b2.bucket.create(args);

		expect(response.status).to.equal(200);
	});

	it.skip('should receive the ID of the new bucket', async function () {
		const response = await this.b2.bucket.create(args);

		expect(response.data.bucketId).to.equal('12345');
	});
});

describe('B2 -> Bucket -> delete()', function () {
	const args = {};

	it.skip('should receive an HTTP 200 response', async function () {
		const response = await this.b2.bucket.delete(args);

		expect(response.status).to.equal(200);
	});

	it.skip('should receive the ID of the new bucket', async function () {
		const response = await this.b2.bucket.delete(args);

		expect(response.data.bucketId).to.equal('12345');
	});
});

describe('B2 -> Bucket -> update()', function () {
	const args = {};

	it.skip('should receive an HTTP 200 response', async function () {
		const response = await this.b2.bucket.update(args);

		expect(response.status).to.equal(200);
	});

	it.skip('should receive the updated info of the bucket', async function () {
		const response = await this.b2.bucket.update(args);

		expect(response.data.bucketInfo.foo).to.equal('bar');
	});
});

describe('B2 -> Bucket -> get()', function () {
	const args = {
		bucketName: 'my_bucket',
	};

	it.skip('should receive an HTTP 200 response', async function () {
		const response = await this.b2.bucket.get(args);

		expect(response.status).to.equal(200);
	});

	it.skip('should receive the ID of the bucket', async function () {
		const response = await this.b2.bucket.get(args);

		expect(response.data.bucketId).to.equal('12345');
	});

	it.skip('should return null on non-existent bucket', async function () {
		const response = await this.b2.bucket.get({
			bucketName: 'not_found',
		});

		expect(response).is.null();
	});
});

describe('B2 -> Bucket -> getUploadUrl()', function () {
	const args = {
		bucketId: '12345',
	};

	it.skip('should receive the upload URL', async function () {
		const response = await this.b2.bucket.getUploadUrl(args);

		expect(response.data.uploadUrl).to.equal('12345');
	});

	it.skip('should receive the authorization token', async function () {
		const response = await this.b2.bucket.getUploadUrl(args);

		expect(response.data.authorizationToken).to.equal('abcdef');
	});
});

describe('B2 -> Key -> create()', function () {
	const args = {
		keyName: 'my_key',
		capabilities: [
			'listKeys'
		]
	};

	it.skip('should receive an HTTP 200 response', async function () {
		const response = await this.b2.key.create(args);

		expect(response.status).to.equal(200);
	});

	it.skip('should have the listKeys capability', async function () {
		const response = await this.b2.key.create(args);

		expect(response.data.capabilities).is.an('array').that.contains('listKeys');
	});
});

describe('B2 -> Key -> list()', function () {
	const args = {
		keyName: 'my_key',
		capabilities: [
			'listKeys'
		]
	};

	it.skip('should receive an HTTP 200 response', async function () {
		const response = await this.b2.key.list(args);

		expect(response.status).to.equal(200);
	});

	it.skip('should have an array of keys', async function () {
		const response = await this.b2.key.list(args);

		expect(response.data.keys).is.an('array');
		expect(response.data.keys).deep.contains.keys(
			'keyName',
			'applicationKeyId',
			'capabilities',
			'accountId',
		);
	});
});

describe('B2 -> Key -> delete()', function () {
	const args = {
		applicationKeyId: '1234abcd'
	};

	it.skip('should receive an HTTP 200 response', async function () {
		const response = await this.b2.key.delete(args);

		expect(response.status).to.equal(200);
	});

	it.skip('should receive the correct accountId', async function () {
		const response = await this.b2.key.delete(args);

		expect(response.data.accountId).to.equal('000000000000');
	});
});

describe.skip('B2 -> File -> upload()');
describe.skip('B2 -> File -> startLargeFile()');
describe.skip('B2 -> File -> getUploadPartUrl()');
describe.skip('B2 -> File -> uploadPart()');
describe.skip('B2 -> File -> finishLargeFile()');
describe.skip('B2 -> File -> cancelLargeFile()');
describe.skip('B2 -> File -> listNames()');
describe.skip('B2 -> File -> listVersions()');
describe.skip('B2 -> File -> listParts()');
describe.skip('B2 -> File -> hide()');
describe.skip('B2 -> File -> getInfo()');
describe.skip('B2 -> File -> getDownloadAuthorization()');
describe.skip('B2 -> File -> downloadByName()');
describe.skip('B2 -> File -> downloadById()');
describe.skip('B2 -> File -> deleteVersion()');
describe.skip('B2 -> File -> delete()');
describe.skip('B2 -> File -> copy()');

describe.skip('utils/getAccountAuthorizationHeader()');
describe.skip('utils/encodeB2String()');
describe.skip('utils/addInfoHeaders()');
describe.skip('utils/addBzHeaders()');