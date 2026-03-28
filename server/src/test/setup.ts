// Global test setup for the server test suite.
// Runs before every test file.

import { beforeAll, afterAll, vi } from 'vitest';

// Set environment variables needed by the app
process.env.JWT_SECRET = 'test-secret-key-for-vitest';
process.env.JWT_EXPIRES_IN = '1h';
process.env.NODE_ENV = 'test';

// Silence console.error during tests to keep output clean
// (errors are still asserted via response status codes)
beforeAll(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  vi.restoreAllMocks();
});
