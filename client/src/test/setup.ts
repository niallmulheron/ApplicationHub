// Global test setup for the client test suite.
// Runs before every test file.

import '@testing-library/jest-dom';

// Mock window.location — jsdom does not support full navigation.
// Use an absolute URL so Axios can parse window.location.href at import time.
Object.defineProperty(window, 'location', {
  value: { href: 'http://localhost:5173/', assign: vi.fn(), replace: vi.fn() },
  writable: true,
});
