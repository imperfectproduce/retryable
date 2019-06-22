export const networkErrors = response => response.status > 500;
export const rateLimitingError = response => response.status === 429;
