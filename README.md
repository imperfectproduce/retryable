# Retryable

100% configurable retry wrapper for all async functions.

#### Usage

###### Install

```sh
$ npm i as-retryable --save
$ yarn add as-retryable
```

###### Basic Fetch Example

```js
import fetch from 'isomorphic-fetch';
import retryable from 'as-retryable';

const getProduct = async (id) => await fetch(`/products/${id}`);

const getProductWithRetry = retryable(getProducts, {
  maxRetries: 3,
  retryOn: (response) => response.status === 503, // Service Unavailable
  delayMs: 500
});

const response = await getProductWithRetry(123);
```

## API

Wraps an existing function that returns a Promise, or async/await.

```js
const withRetry = retryable(fn: function, options?: object);
```

No options are required.  If none are provided, the function will be retried on
all exceptions, up to 3 times, with no delay in between.

| Option     | Default    | Description  |
| ---------- | ---------- |
| maxRetries | 3          | Max number of times to retry. |
| retryOn    | all errors | Logic to determine if the result or error should be retried. |
| delayMs    | 0          | The number of milliseconds to delay between retries. |
| onError    |            | Callback hook invoked on each occurrence of an error (exception or retry). |

### maxRetries

*Type*: integer

No matter the retry logic provided, will not retry greater than max.

### retryOn

*Type*: `function`|`array`

```js
(error: any, attempt: number) => boolean;
[(error: any, attempt: number) => boolean];
```

Function or array of functions providing different scenarios to retry on.
If provided, they are invoked whether or not the original function resolves
successfully.  This is because some APIs (eg Fetch API) may not throw an error
or return a rejected promise in scenarios considered an error.  If an array of
functions is provided, only one case has to return `true` to retry.

### delayMs

*Type*: `function`|`number`

```js
(error, attempt) => number
```

Provide a static number of milliseconds to wait, or implement custom logic based
on the error, number of attempts made, or a backoff algorithm.

### onError

*Type*: `function`

```js
(error, attempt) => {}
```

Hook into errors for logging or similar purposes.  Note that a function resolving
successfully is still considered an error if it should be retried.

#### Utilities for Common Retry Logic

```js
import retryable from 'as-retryable';
import { networkErrors, rateLimitingError } from 'as-retryable/retries';

export const getProductsWithRetry = retryable(getProducts, {
  retryOn: [networkErrors, rateLimitingError]
});
```

#### Use Cases

###### Rate Limiting Retries

```js
export const getProductsWithRetry = retryable(getProducts, {
  maxRetries: 3,
  retryOn: (response) => response.status === 429 && response.headers['Retry-After'] <= 5, // Too Many Requests
  delayMs: (error, attempt) => response.headers['Retry-After'] * 1000,
  onError: (error, attempt) => logger.error(error, attempt)
});
```

## Running Tests

```sh
$ npm run test
$ npm run test:watch # re-run tests on file savess
```
