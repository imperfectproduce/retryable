# Retryable

Flexible and configurable retry wrapper for all promise/async functions.

## Usage

###### Install

```sh
$ npm i @imperfectproduce/retryable --save
$ yarn add @imperfectproduce/retryable
```

###### Basic Fetch Example

```js
import fetch from 'isomorphic-fetch';
import retryable from '@imperfectproduce/retryable';
import { randomBetween } from '@imperfectproduce/retryable/delay';

const getProduct = async (id) => await fetch(`/products/${id}`);

const getProductWithRetry = retryable(getProduct, {
  maxRetries: 3,
  retryOn: (response) => response.status === 503, // Service Unavailable
  delayMs: randomBetween(500, 1000)
});

const response = await getProductWithRetry(123);
```

## API

Wraps an existing function that returns a Promise (or is marked async).

```js
const withRetry = retryable(fn: function, options?: object);
```

Options are optional.  If none are provided, the function will be retried on
all errors, up to 3 times, with no delay in between.  An error means an exception or a rejected promise.

| Option     | Default    | Description  |
| ---------- | ---------- | ------------ |
| maxRetries | 3          | Max number of times to retry. |
| retryOn    | all errors | Logic to determine if the result or error should be retried. |
| delayMs    | 0          | The number of milliseconds to delay between retries. |
| onError    | () => {}   | Callback hook invoked on each occurrence of an error (exception or retry). |

### maxRetries

*Type*: `integer`

No matter the retry logic provided, will not retry greater than max.

### retryOn

*Type*: `function`|`array`

```js
(error: any, attempt: number, args: any[]) => boolean;
[(error: any, attempt: number, args: any[]) => boolean];
```

Function or array of functions describing different scenarios to retry on.
If provided, function(s) are invoked every time, whether or not the original function resolves
successfully.  This is because some APIs (eg Fetch API) may not throw an error
or return a rejected promise in scenarios considered an error.  If an array of
functions is provided, only one has to return `true` to retry.

### delayMs

*Type*: `function`|`number`

```js
500
(error: any, attempt: number, args: any[]) => number;
```

Provide a static number of milliseconds to wait, or implement custom logic based
on the error and attempt number.  A backoff algorithm can be supplied here (see below).

### onError

*Type*: `function`

```js
(error: any, attempt: number, args: any[]) => {};
```

Hook into errors for logging or similar purposes.  Note that this callback function will be invoked if the wrapped function should be retried (see `retryOn`), even if it executed without an error.

## Random/Backoff Algorithms

It's common to add randomness or exponential backoff in the retry wait time to spread out the time
competing clients might retry.  See this
[AWS article]("https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/").

###### randomBetween

```js
import { randomBetween } from '@imperfectproduce/retryable/delay';

const getProductWithRetry = retryable(getProduct, {
  delayMs: randomBetween(1000, 2000) // random time between 1 and 2 seconds
});
```

#### Utilities for Common Retry Logic

```js
import retryable from '@imperfectproduce/retryable';
import { networkErrors, rateLimitingError } from '@imperfectproduce/retryable/fetchErrors';

export const getProductsWithRetry = retryable(getProducts, {
  retryOn: [networkErrors, rateLimitingError]
});
```

#### Use Cases

###### Wrapping All Fetch Calls

Rather than wrapping individual functions, a common one can be wrapped as well.
The third argument `args` passed to all options functions becomes useful to interact with
call specific arguments.

```js
import fetch from 'isomorphic-fetch';

export const retryableFetch = retryable(fetch, {
  maxRetries: 3,
  retryOn: networkErrors,
  delayMs: 1000,
  onError: (error, attempt, args) => {
    const [url, options] = args;
    logger.error(error, attempt, url, options.method);
  }
});
```

###### Rate Limiting Retries

Some API's (eg [Asana]("https://asana.com/developers/documentation/getting-started/rate-limits")) provide the time to wait to honor rate limiting.

```js
export const getProductsWithRetry = retryable(getProducts, {
  maxRetries: 3,
  retryOn: (response) => response.status === 429 && response.headers['Retry-After'] <= 5,
  delayMs: (error, attempt) => error.headers['Retry-After'] * 1000,
  onError: (error, attempt) => logger.error(error, attempt)
});
```

## Running Tests

```sh
$ npm run test
$ npm run test:watch # re-run tests on file saves
```
