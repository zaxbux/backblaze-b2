# Backblaze B2 Node.js Library

[![npm version](https://badge.fury.io/js/backblaze-b2.svg)](https://badge.fury.io/js/backblaze-b2) [![Build Status](https://travis-ci.org/yakovkhalinsky/backblaze-b2.svg?branch=master)](https://travis-ci.org/yakovkhalinsky/backblaze-b2)

A customizable B2 client for Node.js:

* Uses [axios](https://github.com/axios/axios). You can control the axios instance at the request level (see `axios` and `axiosOverride` config arguments) and at the global level (see `axios` config argument at instantiation) so you can use any axios feature.
* Automatically retries on request failure. You can control retry behaviour using the `retries` argument at instantiation.

## Usage

This library uses promises, so all actions on a `B2` instance return a promise in the following pattern:

``` javascript
b2.instanceFunction(arg1, arg2).then(
    successFn(response) { ... },
    errorFn(err) { ... }
);
```

### Basic Example

```javascript
const B2 = require('backblaze-b2');

const b2 = new B2({
  applicationKeyId: 'applicationKeyId', // or accountId
  applicationKey: 'applicationKey' // or masterApplicationKey
});

async function GetBucket() {
  try {
    await b2.authorize(); // must authorize first (authorization lasts 24 hrs)
    let response = await b2.getBucket({ bucketName: 'my-bucket' });
    console.log(response.data);
  } catch (err) {
    console.log('Error getting bucket:', err);
  }
}
```

### Response Object

Each request returns an AxiosResponse object with:

* `status` - int, HTTP error Status
* `statusText`
* `headers`
* `config`
* `request`
* `data` - response returned from backblaze, https://www.backblaze.com/b2/docs/calling.html

### How it works

Each action (see reference below) takes arguments and constructs a request.

### Reference



### Uploading Large Files Example

To upload large files, you should split the file into parts (between 5MB and 5GB) and upload each part seperately.

First, you initiate the large file upload to get the fileId:

```javascript
let response = await b2.startLargeFile({ bucketId, fileName });
let fileId = response.data.fileId;
```

Then, to upload parts, you request at least one `uploadUrl` and use the response to
upload the part with `uploadPart`. The url and token returned by `getUploadPartUrl()`
are valid for 24 hours or until `uploadPart()` fails, in which case you should request
another `uploadUrl` to continue. You may utilize multiple `uploadUrl`s in parallel to
achieve greater upload throughput.

If you are unsure whether you should use multipart upload, refer to the `recommendedPartSize`
value returned by a call to `authorize()`.

```javascript
let response = await b2.getUploadPartUrl({ fileId });

let uploadURL = response.data.uploadUrl;
let authToken = response.data.authorizationToken;

response = await b2.uploadPart({
    partNumber: parNum,
    uploadUrl: uploadURL,
    uploadAuthToken: authToken,
    data: buf
});
// status checks etc.
```

Then finish the uploadUrl:

```javascript
let response = await b2.finishLargeFile({
    fileId,
    partSha1Array: parts.map(buf => sha1(buf))
})
```

If an upload is interrupted, the fileId can be used to get a list of parts
which have already been transmitted. You can then send the remaining
parts before finally calling `b2.finishLargeFile()`.

```javascript
let response = await b2.listParts({
    fileId,
    startPartNumber: 0,
    maxPartCount: 1000
})
```

## Changes

See the [CHANGELOG](https://github.com/yakovkhalinsky/backblaze-b2/blob/master/CHANGELOG.md) for a history of updates.

### Upgrading from 0.9.x to 1.0.x

For this update, we've switched the back end HTTP request library from `request` to `axios` as it has better Promise and progress support built in. However, there are a couple changes that will break your code and ruin your day. Here are the changes:

* The Promise resolution has a different data structure. Where previously, the request response data was the root object in the promise resolution (`res`), this data now resides in `res.data`.
* In v0.9.12, we added request progress reporting via the third parameter to `then()`. Because we are no longer using the same promise library, this functionality has been removed. However, progress reporting is still available by passing a callback function into the `b2.method()` that you're calling. See the documentation below for details.
* In v0.9.x, `b2.downloadFileById()` accepted a `fileId` parameter as a String or Number. As of 1.0.0, the first parameter is now expected to be a plain Object of arguments.

## Contributing

Contributions, suggestions, and questions are welcome. Please review the [contributing guidelines](CONTRIBUTING.md) for details.

### Authors and Contributors

* Yakov Khalinsky (@yakovkhalinsky)
* Ivan Kalinin (@IvanKalinin) at Isolary
* Brandon Patton (@crazyscience) at Isolary
* C. Bess (@cbess)
* Amit (@Amit-A)
* Zsombor Paróczi (@realhidden)
* Oden (@odensc)
