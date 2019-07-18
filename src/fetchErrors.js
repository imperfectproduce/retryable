export const networkErrors = response => response.status >= 502 && response.status <= 504;
export const rateLimitingError = response => response.status === 429;
