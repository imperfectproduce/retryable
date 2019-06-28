const noop = () => {};
const all = () => true;
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Switches on the different inputs of delayMs to form a normalized function,
 * doing the type check upfront and avoiding on each retry.
 *
 * @param {any} delayMs
 * @return {function}
 */
const makeDelayFn = (delayMs) => {
  if (Number.isFinite(delayMs)) {
    return async () => sleep(delayMs);
  }

  if (typeof delayMs === 'function') {
    return async (error, attempt) => {
      const ms = delayMs(error, attempt);
      return sleep(ms);
    };
  }

  return noop;
};

export default (fn, options = {}) => {
  const {
    maxRetries = 3,
    onError = noop, // for notification only (eg logging)
    retryOn = all, // function (or array to support .some?)
    delayMs = null // number (ms) or function returning a number (ms)
  } = options;

  const maybeSleep = makeDelayFn(delayMs);
  const customRetryLogic = retryOn !== all;

  return async (...args) => {
    let attempt = 1;

    while (attempt <= maxRetries) {
      try {
        const result = await fn(...args);

        // a result that is not an exception can still be considered an error and need retrying.
        // only run retry logic if it's custom, otherwise this is a success result by default.
        if (customRetryLogic && retryOn(result, attempt)) {
          // throwing will pass through the catch below, calling onError, and getting re-thrown.
          if (attempt === maxRetries) throw result;

          // considered an error if retrying
          onError(result, attempt);

          // delay and retry
          await maybeSleep(result, attempt);
          attempt += 1;
        } else {
          return result;
        }
      } catch (error) {
        onError(error, attempt);

        // throw original error (and one from the final attempt) if exiting.
        // only run retry function if there are retries remaining.
        if ((attempt === maxRetries) || !retryOn(error, attempt)) throw error;

        // delay and retry
        await maybeSleep(error, attempt);
        attempt += 1;
      }
    }
  };
};
