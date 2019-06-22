import asRetryable from '../src/index';

describe('asRetryable', () => {
  it('returns successful on first try', async () => {
    let invocationCount = 0;
    const resultObj = { success: true };
    const testFn = () => {
      invocationCount += 1;
      return Promise.resolve(resultObj);
    };

    // all default options
    const result = await asRetryable(testFn)();

    expect(result).toEqual(resultObj);
    expect(invocationCount).toEqual(1);
  });

  it('retries at most maxRetries times', async () => {
    let invocationCount = 0;
    const testFn = () => {
      invocationCount += 1;
      throw new Error(invocationCount);
    };
    const options = { maxRetries: 4 };

    try {
      await asRetryable(testFn, options)();
    } catch (ex) {
      expect(invocationCount).toEqual(options.maxRetries);
    }
  });

  it('invokes wrapped function with given args each time', async () => {
    const calledWith = [];
    const testFn = (...args) => {
      calledWith.push(args);
      throw new Error('error');
    };
    const options = { maxRetries: 2 };

    try {
      await asRetryable(testFn, options)('test', 'value');
    } catch (ex) {
      expect(calledWith.length).toEqual(options.maxRetries);
      expect(calledWith[0][0]).toEqual('test');
      expect(calledWith[0][1]).toEqual('value');
      expect(calledWith[1][0]).toEqual('test');
      expect(calledWith[1][1]).toEqual('value');
    }
  });

  it('calls onError on each failed attempt with an exception', async () => {
    let invocationCount = 0;
    const testFn = () => {
      invocationCount += 1;
      throw new Error(invocationCount * 10); // make it differ from attempts
    };
    const onErrorInvocations = [];
    const options = {
      maxRetries: 2,
      // called with the error and the attempt number
      onError: (error, attempt) => onErrorInvocations.push({
        error: Number(error.message),
        attempt
      })
    };

    try {
      await asRetryable(testFn, options)();
    } catch (ex) {
      expect(onErrorInvocations.length).toEqual(options.maxRetries);
      expect(onErrorInvocations[0].error).toEqual(10); // 10X invocation count
      expect(onErrorInvocations[0].attempt).toEqual(1);
      expect(onErrorInvocations[1].error).toEqual(20); // 10X invocation count
      expect(onErrorInvocations[1].attempt).toEqual(2);
    }
  });

  it('calls onError on each failed attempt due to retry logic', async () => {
    let invocationCount = 0;
    const testFn = () => {
      invocationCount += 1;
      const result = invocationCount * 10;
      return result; // not an exception (but retry below will treat it as such)
    };
    const onErrorInvocations = [];
    const options = {
      maxRetries: 2,
      // called with the error and the attempt number
      onError: (error, attempt) => onErrorInvocations.push({ error, attempt }),
      retryOn: () => true
    };

    try {
      await asRetryable(testFn, options)();
    } catch (ex) {
      expect(onErrorInvocations.length).toEqual(options.maxRetries);
      expect(onErrorInvocations[0].error).toEqual(10); // 10X invocation count
      expect(onErrorInvocations[0].attempt).toEqual(1);
      expect(onErrorInvocations[1].error).toEqual(20); // 10X invocation count
      expect(onErrorInvocations[1].attempt).toEqual(2);
    }
  });

  it('rejects with final error as the exception or promise rejection after last retry', async () => {
    let invocationCount = 0;
    const testFn = () => {
      invocationCount += 1;
      throw new Error(invocationCount); // differs each time
    };
    const options = { maxRetries: 2 };

    try {
      await asRetryable(testFn, options)();
    } catch (ex) {
      expect(Number(ex.message)).toEqual(options.maxRetries);
    }
  });

  it('exits if explicit retry logic is provided and the error does not pass', async () => {
    let invocationCount = 0;
    const testFn = () => {
      invocationCount += 1;
      throw new Error('error');
    };
    const options = {
      maxRetries: 5,
      retryOn: () => false
    };

    try {
      await asRetryable(testFn, options)();
    } catch (ex) {
      expect(invocationCount).toEqual(1);
    }
  });

  it('keeps retrying on exception if explicit retry logic is provided and the error passes', async () => {
    let invocationCount = 0;
    const errorMessage = 'ERROR';
    const testFn = () => {
      invocationCount += 1;
      throw new Error(errorMessage);
    };
    const options = {
      maxRetries: 5,
      retryOn: error => error.message === errorMessage
    };

    try {
      await asRetryable(testFn, options)();
    } catch (ex) {
      expect(invocationCount).toEqual(options.maxRetries);
      expect(ex.message).toEqual(errorMessage);
    }
  });

  it('delays a static amount of ms on each failure', async () => {
    const testFn = () => { throw new Error('some error'); };
    const options = {
      maxRetries: 3,
      delayMs: 300
    };

    const start = Date.now();

    try {
      await asRetryable(testFn, options)();
    } catch (ex) {
      const ellapsed = Date.now() - start;
      // we don't sleep/delay after the final invocation
      const sleeps = options.maxRetries - 1;
      expect(ellapsed).toBeGreaterThanOrEqual(options.delayMs * sleeps);
    }
  });

  it('delays a static amount of ms, given by function, on each failure', async () => {
    const delayMs = 300;
    const testFn = () => { throw new Error('some error'); };
    const options = {
      maxRetries: 3,
      delayMs: () => delayMs
    };

    const start = Date.now();

    try {
      await asRetryable(testFn, options)();
    } catch (ex) {
      const ellapsed = Date.now() - start;
      // we don't sleep/delay after the final invocation
      const sleeps = options.maxRetries - 1;
      expect(ellapsed).toBeGreaterThanOrEqual(delayMs * sleeps);
    }
  });
});
