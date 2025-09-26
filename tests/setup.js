// Test setup for Vitest
// Global test configuration and utilities

// Mock SQLite WASM for testing environment
global.SQLite = {
  init: () => Promise.resolve({
    open: () => ({
      exec: () => Promise.resolve([]),
      prepare: () => ({
        bind: () => {},
        step: () => ({ row: [] }),
        finalize: () => {}
      }),
      close: () => {}
    })
  })
}

// Console error suppression for expected test failures
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (typeof args[0] === 'string' && args[0].includes('Test')) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})