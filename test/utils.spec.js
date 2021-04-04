/**
 * @file Contains tests for the B2 API SDK utils.
 */

import { expect } from 'chai';
import { InvalidArgumentError, InvalidCredentialsError } from '../lib/errors';
import { createSHA1Checksum, encodeB2String, getAccountAuthorizationHeader, getContentLength, isValidHeaderName, makeB2SSEHeaders, makeBzInfoHeaders } from '../lib/utils';
import { string_encoding } from './utils.json';

describe('utils/', function () {
	describe('getAccountAuthorizationHeader()', function () {
		it('should return a valid Authorization header field value', function (done) {
			expect(getAccountAuthorizationHeader({
				applicationKeyId: 'applicationKeyId',
				applicationKey: 'applicationKey',
			})).to.equal('Basic YXBwbGljYXRpb25LZXlJZDphcHBsaWNhdGlvbktleQ==');

			done();
		});

		it('should throw an error on invalid credentials', function (done) {
			expect(() => getAccountAuthorizationHeader()).to.throw(InvalidCredentialsError);

			expect(() => getAccountAuthorizationHeader({
				applicationKey: 'foo',
			})).to.throw(InvalidCredentialsError, 'Invalid applicationKeyId');

			expect(() => getAccountAuthorizationHeader({
				applicationKeyId: 'foo',
			})).to.throw(InvalidCredentialsError, 'Invalid applicationKey');

			done();
		});
	});
	describe('encodeB2String()', function () {
		it('should encode all strings according to Backblaze\'s test cases', function (done) {
			string_encoding.forEach((testCase) => {
				expect(encodeB2String(testCase.string)).to.satisfy(s => {
					return s === testCase.minimallyEncoded || s === testCase.fullyEncoded;
				});
			});

			done();
		});
	});

	describe('isValidHeaderName()', function () {
		it('should return true on a valid header name', function (done) {
			expect(isValidHeaderName('abcdefghijklmnopqrstuvwxyz0123456789-_.`~!#$%^&*\'')).to.equal(true);
			done();
		});

		it('should return false on an invalid header name', function (done) {
			expect(isValidHeaderName('foo:bar')).to.equal(false);
			done();
		});
	});

	describe('makeBzInfoHeaders()', function() {
		it('should return an object containing keys that begin with "X-Bz-Info-"', function(done) {
			expect(makeBzInfoHeaders({
				'X-Bz-Info-b2-expires': 'Wed, 21 Oct 2015 07:28:00 GMT',
				'src_last_modified_millis': '1617334786597',
				'b2-cache-control': 'no-cache',
			})).to.have.all.keys(
				'X-Bz-Info-b2-expires',
				'X-Bz-Info-src_last_modified_millis',
				'X-Bz-Info-b2-cache-control'
			);
			done();
		});

		it('should throw an error on too many header names', function(done) {
			expect(() => makeBzInfoHeaders({
				'a': '1',
				'b': '2',
				'c': '3',
				'd': '4',
				'e': '5',
				'f': '6',
				'g': '7',
				'h': '8',
				'i': '9',
				'j': '10',
				'k': '11',
			})).to.throw(InvalidArgumentError, 'Maximum of 10 X-Bz-Info-* headers allowed');

			done();
		});

		it('should throw an error on invalid header names', function(done) {
			expect(() => makeBzInfoHeaders({
				'bad:name': 'foo',
			})).to.throw(InvalidArgumentError, 'X-Bz-Info header "bad:name" contains invalid characters');

			done();
		});

		it('should throw an error on invalid header values', function(done) {
			expect(() => makeBzInfoHeaders({
				'foo': 123456789,
			})).to.throw(InvalidArgumentError, 'X-Bz-Info-foo header value must be a string');

			done();
		});
	});

	describe('getContentLength()', function() {
		it('should return the correct length of a string', function(done) {
			const data = 'aaaa';
			expect(getContentLength(data)).to.equal(4);
			done();
		});

		it('should return the correct length of a Buffer', function(done) {
			const data = new Buffer.alloc(256);
			expect(getContentLength(data)).to.equal(256);
			done();
		});

		it('should return the correct length of an ArrayBuffer', function(done) {
			const data = new ArrayBuffer(256);
			expect(getContentLength(data)).to.equal(256);
			done();
		});

	});

	describe('makeB2SSEHeaders()', function() {
		it('should return the correct headers for B2-managed keys', function(done) {
			expect(makeB2SSEHeaders({
				mode: 'SSE-B2',
				algorithm: 'AES256',
			})).to.include({
				'X-Bz-Server-Side-Encryption': 'AES256',
			});

			done();
		});
		
		it('should return the correct headers for customer-managed keys', function(done) {
			expect(makeB2SSEHeaders({
				mode: 'SSE-C',
				algorithm: 'AES256',
				customerKey: 'abc',
				customerKeyMd5: 'def'
			})).to.include({
				'X-Bz-Server-Side-Encryption-Customer-Algorithm': 'AES256',
				'X-Bz-Server-Side-Encryption-Customer-Key': 'YWJj',
				'X-Bz-Server-Side-Encryption-Customer-Key-Md5': 'ZGVm',
			});

			done();
		});
	});

	describe('createSHA1Checksum()', function() {
		it('should return the correct hex-encoded SHA1 digest', function(done) {
			expect(createSHA1Checksum('data')).to.equal('a17c9aaa61e80a1bf71d0d850af4e5baa9800bbd');

			done();
		});
	});
});
