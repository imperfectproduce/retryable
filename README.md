# Retryable

Flexible wrapper around async functions adding and configuring retry logic.

### Usage

```sh
$ npm i as-retryable --save
$ yarn add as-retryable
```

```js
import fetch from 'isomoprhic-fetch';
import retryable from 'as-retryable';

const getProducts = async () => await fetch('/products');

export const getProductsWithRetry = retryable(getProducts, {
  maxRetries: 3,
  retryOn: (response) => response.status === 429,
  delayMs: 500,
  onError: (error, attempt) => logger.error(error, attempt)
});
```

##### Utilities for Common Retry logic

```js
import retryable from 'as-retryable';
import { networkErrors, rateLimitingError } from 'as-retryable/lib/fetchResponse';

export const getProductsWithRetry = retryable(getProducts, {
  retryOn: [networkErrors, rateLimitingError]
});
```

retryOn: Retries on all exceptions by default, but will also run on a successful response as well.
It's possible the result of the async function may still be considered an error result,
even if it does not throw an error.  A good example of this is the Fetch API.  
