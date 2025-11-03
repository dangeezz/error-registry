/**
 * Test file to verify type-safe handler inference
 * This file should compile without errors, demonstrating that TypeScript
 * correctly infers specific error types in handlers based on the errors registry.
 */

import { createErrorRegistry } from './errorRegistry';

// Define test error classes
class NotFoundError extends Error {
  code: 'NOT_FOUND';
  statusCode: number;
  
  constructor(data: { code: 'NOT_FOUND'; message: string; statusCode: number }) {
    super(data.message);
    this.code = 'NOT_FOUND';
    this.statusCode = data.statusCode;
    this.name = 'NotFoundError';
  }
}

class ValidationError extends Error {
  field: string;
  value: unknown;
  
  constructor(data: { field: string; value: unknown; message?: string }) {
    super(data.message || `Validation failed for ${data.field}`);
    this.field = data.field;
    this.value = data.value;
    this.name = 'ValidationError';
  }
}

class ServerError extends Error {
  statusCode: number;
  stack?: string;
  
  constructor(message: string, statusCode: number, stack?: string) {
    super(message);
    this.statusCode = statusCode;
    this.stack = stack;
    this.name = 'ServerError';
  }
}

// Test type-safe handlers with class constructors
const registryWithClasses = createErrorRegistry({
  errors: {
    NOT_FOUND: NotFoundError,
    VALIDATION_ERROR: ValidationError,
  },
  handlers: {
    // TypeScript should infer error as NotFoundError
    NOT_FOUND: (error) => {
      // These should work - TypeScript knows these properties exist
      // If type inference is working, error is typed as NotFoundError
      const code: 'NOT_FOUND' = error.code;
      const statusCode: number = error.statusCode;
      const message: string = error.message;
      
      // TypeScript will error if we try to access non-existent properties
      // This demonstrates type safety:
      // error.nonExistentProperty; // Would cause TypeScript error
      
      console.log('Not found:', code, statusCode, message);
    },
    
    // TypeScript should infer error as ValidationError
    VALIDATION_ERROR: (error) => {
      // These should work - TypeScript knows these properties exist
      const field: string = error.field;
      const value: unknown = error.value;
      const message: string = error.message;
      
      console.log('Validation error:', field, value, message);
    },
  },
});

// Test type-safe handlers with factory functions
const registryWithFactories = createErrorRegistry({
  errors: {
    SERVER_ERROR: (data: { message?: string; statusCode?: number; stack?: string }) => {
      return new ServerError(
        data.message || 'Server error',
        data.statusCode || 500,
        data.stack
      );
    },
  },
  handlers: {
    // TypeScript should infer error as ServerError (returned by factory)
    SERVER_ERROR: (error) => {
      // These should work - TypeScript knows these properties exist
      const statusCode: number = error.statusCode;
      const stack: string | undefined = error.stack;
      const message: string = error.message;
      
      console.log('Server error:', statusCode, stack, message);
    },
  },
});

// Test mixed: class constructors and factory functions
const registryMixed = createErrorRegistry({
  errors: {
    NOT_FOUND: NotFoundError,
    SERVER_ERROR: (data: { message?: string; statusCode?: number; stack?: string }) => {
      return new ServerError(
        data.message || 'Server error',
        data.statusCode || 500,
        data.stack
      );
    },
  },
  handlers: {
    // Should be NotFoundError
    NOT_FOUND: (error) => {
      const code: 'NOT_FOUND' = error.code;
      console.log('Not found:', code);
    },
    
    // Should be ServerError
    SERVER_ERROR: (error) => {
      const statusCode: number = error.statusCode;
      console.log('Server error:', statusCode);
    },
  },
});

// Test variadic context arguments
const registryWithContext = createErrorRegistry({
  errors: {
    NOT_FOUND: NotFoundError,
  },
  handlers: {
    NOT_FOUND: (error, requestId: string, userId: string, timestamp: number) => {
      // error should be typed as NotFoundError
      const code: 'NOT_FOUND' = error.code;
      console.log('Not found:', code, requestId, userId, timestamp);
    },
  },
});

// Export to ensure code is actually used (prevents unused variable warnings)
export { registryWithClasses, registryWithFactories, registryMixed, registryWithContext };

