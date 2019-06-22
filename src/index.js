const noop = () => {};
const all = () => true;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

const maybeSleep = async (error, attempt, delayMs) => {
  if (Number.isFinite(delayMs)) {
    await sleep(delayMs);
  } else if (typeof delayMs === 'function') {
    const ms = delayMs(error, attempt);
    await sleep(ms);
  }
};

export default (fn, options = {}) => {
  const {
    maxRetries = 3,
    onError = noop, // for notification only (eg logging)
    retryOn = all, // function (or array to support .some?)
    delayMs = null // number (ms) or function returning a number (ms)
  } = options;

  return async (...args) => {
    let attempt = 1;

    while (attempt <= maxRetries) {
      try {
        const result = await fn(...args);

        // Only run the retry logic if it is explicitly provided
        // a result that is not an exception, but needing retry, is considered an error
        if (retryOn !== all && retryOn(result, attempt)) {
          if (attempt === maxRetries) {
            // this will pass through the catch below, calling onError, and getting re-thrown
            throw result;
          } else {
            // log the error
            onError(result, attempt);
          }

          // sleep, increment attempts, and retry
          await maybeSleep(result, attempt, delayMs);
          attempt += 1;
        } else {
          return result;
        }
      } catch (error) {
        onError(error, attempt);

        // throw original error (and final attempt one) if exiting
        // only run retry function if there are retries remaining
        if ((attempt === maxRetries) || !retryOn(error, attempt)) throw error;

        // sleep, increment attempts, and retry
        await maybeSleep(error, attempt, delayMs);
        attempt += 1;
      }
    }
  };
};
