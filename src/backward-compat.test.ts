/**
 * Verify backward compatibility - existing code should still work
 */

import { createErrorRegistry } from './errorRegistry';

class TestError extends Error {
  constructor(data: any) {
    super(data.message);
    this.name = 'TestError';
  }
}

// Old style usage (no errors registry, just handlers)
// This should still work
const registryOldStyle = createErrorRegistry({
  handlers: {
    404: (error) => {
      // error is typed as Error (the generic type)
      console.log(error.message);
    },
  },
});

// Using without explicit error types in handlers
// Should fall back to generic Error type
const registryNoErrors = createErrorRegistry({
  handlers: {
    TEST: (error) => {
      // error is typed as Error (default)
      console.log(error.message);
    },
  },
});

// Mixed: some errors registered, some handlers not
const registryMixed = createErrorRegistry({
  errors: {
    NOT_FOUND: TestError,
  },
  handlers: {
    // This handler matches an error - should be typed as TestError
    NOT_FOUND: (error) => {
      // error should be TestError
      const name: string = error.name;
      console.log(name);
    },
    // This handler doesn't match any error - should be typed as Error
    OTHER: (error) => {
      // error should be Error (fallback)
      const message: string = error.message;
      console.log(message);
    },
  },
});

export { registryOldStyle, registryNoErrors, registryMixed };

