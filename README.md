# Error Registry

A configurable error handling system with registry pattern for flexible error code lookup, custom error classes, and global error handlers.

## Features

- 🎯 **Flexible Error Code Lookup** - Customizable property seekers for finding error codes
- 🔧 **Registry Pattern** - Map error codes to custom error classes
- 🌐 **Global Error Handlers** - Centralized error handling with handler registry
- 🔄 **Runtime Registration** - Dynamically register errors and handlers
- 📦 **TypeScript Support** - Full TypeScript support with generic types
- 🎨 **Customizable Base Errors** - Use your own base error class or factory

## Installation

```bash
npm install @dang33zz/error-registry
```

## Quick Start

```typescript
import { createErrorRegistry } from '@dang33zz/error-registry';

// Define custom error classes
class NotFoundError extends Error {
  constructor(data: any) {
    super(data.message);
    this.name = 'NotFoundError';
  }
}

class ValidationError extends Error {
  constructor(data: any) {
    super(data.message);
    this.name = 'ValidationError';
  }
}

// Create error registry
const errorRegistry = createErrorRegistry({
  seekers: ['code', 'status'], // Properties to search for error codes
  errors: {
    'NOT_FOUND': NotFoundError,
    404: NotFoundError,
    'VALIDATION_ERROR': ValidationError,
    400: ValidationError,
  },
  handlers: {
    404: (error) => console.error('Not found:', error),
    400: (error) => console.error('Validation error:', error),
  },
});

// Create errors
const error1 = errorRegistry.createError({ code: 'NOT_FOUND', message: 'User not found' });
console.log(error1 instanceof NotFoundError); // true

const error2 = errorRegistry.createError({ status: 404, message: 'Resource not found' });
console.log(error2 instanceof NotFoundError); // true

// Handle errors
await errorRegistry.handleError(error1);
await errorRegistry.handleError(error2);
```

## API

### `createErrorRegistry<TErrorData, TError>(config?)`

Creates a configurable error registry instance.

#### Configuration Options

```typescript
interface Config<TErrorData = unknown, TError extends Error = Error> {
  /**
   * Array of property names to search for error codes in error data.
   * Default: ["code", "status"]
   */
  seekers?: string[];

  /**
   * Factory function or class constructor to create the base error class
   * when no custom error is found in the registry.
   */
  baseError?: ((data: TErrorData) => TError) | (new (data: TErrorData) => TError);

  /**
   * Registry mapping error codes or status codes to custom error classes or factory functions.
   */
  errors?: Record<string | number, ((data: TErrorData) => TError) | (new (data: TErrorData) => TError)>;

  /**
   * Registry mapping error codes or status codes to handler functions.
   * Handlers receive variadic context arguments for flexible error handling.
   */
  handlers?: Record<string | number, (error: TError, ...ctx: any[]) => void | Promise<void>>;
}
```

#### Returns

An `ErrorRegistry` instance with the following methods:

- **`createError(data: TErrorData): TError`** - Creates an error instance from error data. The system searches for error codes using the configured seekers, then checks the error registry. Falls back to baseError if provided, or generic Error as last resort.

- **`handleError(error: TError, ...ctx: any[]): Promise<void>`** - Handles an error by invoking the registered handler with variadic context arguments. The system searches for a handler by checking each seeker property on the error object. If no handler is found via seekers, it falls back to using the error's constructor name.

- **`registerError(key: string | number, creator: ErrorCreator<TErrorData, TError>): void`** - Registers a custom error class or factory function for a specific error code or status code. Accepts both class constructors and factory functions.

- **`registerHandler(key: string | number, fn: (error: TError, ...ctx: any[]) => void | Promise<void>): void`** - Registers a handler function for a specific error code or status code. Handlers receive variadic context arguments.

- **`unregisterError(key: string | number): void`** - Unregisters a custom error class or factory function for a specific error code or status code.

- **`unregisterHandler(key: string | number): void`** - Unregisters a handler function for a specific error code or status code.

- **`clear(): void`** - Clears all registered errors and handlers from the registry.

## Examples

### Using with Custom Base Error Class

```typescript
class ApiError extends Error {
  code: string;
  statusCode: number;
  
  constructor(data: { code: string; statusCode: number; message: string }) {
    super(data.message);
    this.code = data.code;
    this.statusCode = data.statusCode;
    this.name = 'ApiError';
  }
}

const errorRegistry = createErrorRegistry({
  seekers: ['code'],
  baseError: ApiError,
  errors: {
    'NOT_FOUND': NotFoundError,
    'UNAUTHORIZED': UnauthorizedError,
  },
});
```

### Using with Factory Function

```typescript
const errorRegistry = createErrorRegistry({
  seekers: ['errorCode'],
  baseError: (data: { errorCode: string; message: string }) => {
    return new CustomError(data.errorCode, data.message);
  },
});
```

### Dynamic Registration

```typescript
const errorRegistry = createErrorRegistry();

// Register errors at runtime (class constructor)
errorRegistry.registerError('OUT_OF_STOCK', OutOfStockError);
errorRegistry.registerError(500, ServerError);

// Register errors at runtime (factory function)
errorRegistry.registerError('CUSTOM', (data) => new CustomError(data.field1, data.field2));

// Register handlers at runtime
errorRegistry.registerHandler(401, async (error) => {
  localStorage.removeItem('token');
  window.location.href = '/login';
});

errorRegistry.registerHandler('OUT_OF_STOCK', (error) => {
  showNotification('Product is out of stock');
});
```

### Error Handling with Variadic Context

```typescript
const errorRegistry = createErrorRegistry({
  handlers: {
    500: async (error, requestId, userId, timestamp) => {
      // Handlers receive variadic context arguments
      await logToSentry(error, { requestId, userId, timestamp });
    },
    404: (error, requestId) => {
      // Can use single context argument
      console.log(`Request ${requestId} resulted in 404`);
    },
  },
});

// Pass multiple context arguments
await errorRegistry.handleError(error, 'req-123', 'user-456', Date.now());

// Or pass a single context object (still works)
await errorRegistry.handleError(error, { requestId: 'abc123', userId: 'user456' });
```

### Unregistering and Clearing

```typescript
const errorRegistry = createErrorRegistry({
  errors: {
    'OUT_OF_STOCK': OutOfStockError,
    'NOT_FOUND': NotFoundError,
  },
  handlers: {
    404: (error) => console.log('Not found'),
    500: (error) => console.log('Server error'),
  },
});

// Unregister a specific error
errorRegistry.unregisterError('OUT_OF_STOCK');
// Now creating an error with code 'OUT_OF_STOCK' will use baseError or generic Error

// Unregister a specific handler
errorRegistry.unregisterHandler(404);
// Now handling an error with status 404 won't trigger the handler

// Clear all registered errors and handlers
errorRegistry.clear();
// Registry is now empty
```

## Framework Integration

Quick examples for common frameworks. For more detailed examples, see [EXAMPLES.md](./EXAMPLES.md).

<details>
<summary>Axios Integration</summary>

```typescript
import axios from 'axios';
import { createErrorRegistry } from '@dang33zz/error-registry';

// Custom base error as factory function
const createApiError = (data: any) => {
  const error = new Error(data.message || 'API Error');
  (error as any).statusCode = data.statusCode || data.status || 500;
  (error as any).code = data.code;
  error.name = 'ApiError';
  return error;
};

const errorRegistry = createErrorRegistry({
  seekers: ['errorCode', 'statusCode', 'status'], // Custom seekers
  baseError: createApiError, // Custom base error as factory
  // Error mapping is optional - only handlers for global error handling
  handlers: {
    'NOT_FOUND': (error) => console.log('Resource not found'),
    404: (error) => console.log('404 handler'),
    'UNAUTHORIZED': () => redirectToLogin(),
    401: () => redirectToLogin(),
  },
});

// Global error handling
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const apiError = errorRegistry.createError({
      errorCode: error.response?.data?.errorCode,
      statusCode: error.response?.status,
      message: error.response?.data?.message || error.message,
    });
    await errorRegistry.handleError(apiError);
    return Promise.reject(apiError);
  }
);
```
</details>

<details>
<summary>Express Integration</summary>

```typescript
import express from 'express';
import { createErrorRegistry } from '@dang33zz/error-registry';

// Custom base error
class HttpError extends Error {
  statusCode: number;
  code?: string;
  
  constructor(data: any) {
    super(data.message || 'HTTP Error');
    this.statusCode = data.statusCode || data.status || 500;
    this.code = data.code;
    this.name = 'HttpError';
  }
}

const errorRegistry = createErrorRegistry({
  seekers: ['code', 'status'],
  baseError: HttpError, // Custom base error
  errors: {
    'NOT_FOUND': NotFoundError, // Optional error mapping with code
    404: NotFoundError, // Optional error mapping with status
    'VALIDATION_ERROR': ValidationError,
    400: ValidationError,
  },
  handlers: {
    'NOT_FOUND': (error, ctx) => console.log('Not found'),
    404: (error, ctx) => console.log('404 handler'),
    'VALIDATION_ERROR': (error, ctx) => console.log('Validation failed'),
    400: (error, ctx) => console.log('400 handler'),
  },
});

const app = express();

// Global error handling
app.use((err, req, res, next) => {
  const error = errorRegistry.createError({
    status: err.status || 500,
    code: err.code,
    message: err.message,
  });
  
  errorRegistry.handleError(error, { req, res });
  res.status(error.statusCode || 500).json({ error: error.message });
});

// Dynamic registration
errorRegistry.registerError('FORBIDDEN', ForbiddenError);
errorRegistry.registerHandler('FORBIDDEN', (error) => {
  console.log('Access forbidden');
});

// Creating errors in routes
app.get('/users/:id', (req, res, next) => {
  const error = errorRegistry.createError({
    code: 'NOT_FOUND',
    message: 'User not found',
  });
  next(error);
});
```
</details>

<details>
<summary>Next.js Integration</summary>

```typescript
// lib/errorRegistry.ts
import { createErrorRegistry } from '@dang33zz/error-registry';

// Custom base error as factory function
const createNextApiError = (data: any) => {
  const error = new Error(data.message || 'API Error');
  (error as any).statusCode = data.statusCode || data.status || 500;
  (error as any).code = data.code;
  error.name = 'NextApiError';
  return error;
};

export const errorRegistry = createErrorRegistry({
  seekers: ['code', 'status'],
  baseError: createNextApiError, // Custom base error as factory
  // Error mapping is optional - can use just handlers for global error handling
  handlers: {
    'NOT_FOUND': (error) => console.log('Not found'),
    404: (error) => console.log('404 handler'),
    'UNAUTHORIZED': (error) => console.log('Unauthorized'),
    401: (error) => console.log('401 handler'),
  },
});

// app/api/route.ts or pages/api/route.ts
import { errorRegistry } from '@/lib/errorRegistry';

export async function GET() {
  try {
    // Creating errors
    const error = errorRegistry.createError({
      code: 'NOT_FOUND',
      message: 'Resource not found',
    });
    throw error;
  } catch (error) {
    const apiError = errorRegistry.createError({
      status: error.status || 500,
      code: error.code,
      message: error.message,
    });
    await errorRegistry.handleError(apiError);
    return Response.json({ error: apiError.message }, { status: apiError.statusCode || 500 });
  }
}
```
</details>

## TypeScript

Full TypeScript support with generics:

```typescript
interface MyErrorData {
  code: string;
  message: string;
  timestamp: number;
}

class MyError extends Error {
  code: string;
  timestamp: number;
  
  constructor(data: MyErrorData) {
    super(data.message);
    this.code = data.code;
    this.timestamp = data.timestamp;
  }
}

const errorRegistry = createErrorRegistry<MyErrorData, MyError>({
  seekers: ['code'],
  baseError: MyError,
});
```

## License

MIT

