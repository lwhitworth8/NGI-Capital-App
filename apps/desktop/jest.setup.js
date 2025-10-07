import '@testing-library/jest-dom';

// Polyfill TextEncoder/TextDecoder/Response for tests
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Polyfill Response for MSW
if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init) {
      this.body = body;
      this.init = init || {};
      this.status = this.init.status || 200;
      this.statusText = this.init.statusText || '';
      this.headers = this.init.headers || {};
    }
  };
}

// Polyfill BroadcastChannel for MSW
if (typeof global.BroadcastChannel === 'undefined') {
  global.BroadcastChannel = class BroadcastChannel {
    constructor(name) {
      this.name = name;
    }
    postMessage() {}
    addEventListener() {}
    removeEventListener() {}
    close() {}
  };
}

// Mock fetch globally
global.fetch = jest.fn(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve([]),
  })
);

// Suppress console errors for tests
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    const msg = args?.[0]?.toString?.() || '';
    if (msg.includes('act(') || msg.includes('wrapped in act')) {
      return;
    }
    originalError.apply(console, args);
  };
});

afterAll(() => {
  console.error = originalError;
});