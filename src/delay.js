/* Algorithms to apply as the delayMs option to add randomness and/or backoff to retries */

/**
 * @param {number} min The minimum number of milliseconds.
 * @param {number} max The maximum number of milliseconds.
 * @returns {function} Function to be used for delayMs
 */
export const randomBetween = (min, max) => () => {
  const diff = max - min;
  const randomInterval = Math.round(Math.random() * diff);
  return min + randomInterval;
};
