# Usage Examples

Detailed examples for integrating error-registry with popular frameworks and libraries.

## Table of Contents

- [Axios](#axios)
  - Global Error Handling with Custom Seekers, Base Error, and Handlers
  - Error Mapping is Optional - Global Error Handling Only
- [Express](#express)
  - Global Error Handling with Optional Mapping, Base Error, Dynamic Registration, and Error Creation
  - Error Mapping is Optional - Global Error Handling Only
- [Next.js](#nextjs)
  - Global Error Handling with Optional Mapping, Base Error, and Error Creation
  - Middleware Example
  - App Router Route Handler Example (Next.js 13)
  - App Router Route Handler Example (Next.js 15+)
  - App Router Route Handler with Error Wrapper (Next.js 15+)
  - Pages Router Example
  - Error Mapping is Optional - Global Error Handling Only
- [Validation Libraries](#validation-libraries)
  - Yup Integration Example
  - Zod Integration Example

## Axios

### Global Error Handling with Custom Seekers, Base Error, and Handlers

```typescript
import axios from 'axios';
import { createErrorRegistry } from '@dang33zz/error-registry';

// Define custom error classes
class NotFoundError extends Error {
  statusCode: number;
  code: string;
  
  constructor(data: any) {
    super(data.message || 'Not found');
    this.name = 'NotFoundError';
    this.statusCode = data.statusCode || data.status || 404;
    this.code = data.code || 'NOT_FOUND';
  }
}

class UnauthorizedError extends Error {
  statusCode: number;
  code: string;
  
  constructor(data: any) {
    super(data.message || 'Unauthorized');
    this.name = 'UnauthorizedError';
    this.statusCode = data.statusCode || data.status || 401;
    this.code = data.code || 'UNAUTHORIZED';
  }
}

class ServerError extends Error {
  statusCode: number;
  code: string;
  
  constructor(data: any) {
    super(data.message || 'Server error');
    this.name = 'ServerError';
    this.statusCode = data.statusCode || data.status || 500;
    this.code = data.code || 'SERVER_ERROR';
  }
}

// Custom base error for unmapped errors
class ApiError extends Error {
  statusCode: number;
  code?: string;
  
  constructor(data: any) {
    super(data.message || 'API Error');
    this.name = 'ApiError';
    this.statusCode = data.statusCode || data.status || 500;
    this.code = data.code;
  }
}

// Create error registry with custom seekers, base error, and handlers
const errorRegistry = createErrorRegistry({
  // Custom seekers - checks these properties in order
  seekers: ['errorCode', 'statusCode', 'status'],
  
  // Custom base error for errors not in the registry
  baseError: ApiError,
  
  // Optional error mapping - can use both codes and status codes
  errors: {
    'NOT_FOUND': NotFoundError,
    404: NotFoundError,
    'UNAUTHORIZED': UnauthorizedError,
    401: UnauthorizedError,
    'SERVER_ERROR': ServerError,
    500: ServerError,
  },
  
  // Handlers with both code and status
  handlers: {
    'NOT_FOUND': async (error) => {
      console.log('Not found error:', error.message);
    },
    404: async (error) => {
      // This handler runs for status 404 even if errorCode is NOT_FOUND
      console.log('404 status handler:', error.message);
    },
    'UNAUTHORIZED': async (error) => {
      // Redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    },
    401: async (error) => {
      // This handler also runs for 401 status
      console.log('Unauthorized access');
    },
    'SERVER_ERROR': async (error) => {
      await logToSentry(error);
    },
    500: async (error) => {
      await logToSentry(error);
      console.error('Server error:', error);
    },
  },
});

// Global error handling with axios interceptor
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Create error from axios error response
    const apiError = errorRegistry.createError({
      errorCode: error.response?.data?.errorCode, // Uses first seeker
      statusCode: error.response?.status, // Fallback to second seeker
      message: error.response?.data?.message || error.message,
    });
    
    // Global error handler processes the error
    await errorRegistry.handleError(apiError);
    
    return Promise.reject(apiError);
  }
);
```

### Error Mapping is Optional - Global Error Handling Only

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

// Error mapping is optional - can use just handlers for global error handling
const errorRegistry = createErrorRegistry({
  seekers: ['errorCode', 'statusCode', 'status'],
  baseError: createApiError, // Custom base error as factory
  // No errors mapping - all errors use baseError
  handlers: {
    'NOT_FOUND': async (error) => {
      console.log('Not found:', error.message);
    },
    404: async (error) => {
      console.log('404 handler:', error.message);
    },
    'UNAUTHORIZED': async (error) => {
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    },
    500: async (error) => {
      await logToSentry(error);
    },
  },
});

// Global error handling - all errors use baseError but handlers still run
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const apiError = errorRegistry.createError({
      errorCode: error.response?.data?.errorCode,
      statusCode: error.response?.status,
      message: error.response?.data?.message || error.message,
    });
    
    // All errors use baseError, but handlers are still invoked
    await errorRegistry.handleError(apiError);
    
    return Promise.reject(apiError);
  }
);
```

## Express

### Global Error Handling with Optional Mapping, Base Error, Dynamic Registration, and Error Creation

```typescript
import express from 'express';
import { createErrorRegistry } from '@dang33zz/error-registry';

// Define custom error classes
class NotFoundError extends Error {
  statusCode: number;
  code: string;
  
  constructor(data: any) {
    super(data.message || 'Not found');
    this.name = 'NotFoundError';
    this.statusCode = data.statusCode || data.status || 404;
    this.code = data.code || 'NOT_FOUND';
  }
}

class ValidationError extends Error {
  statusCode: number;
  code: string;
  fields?: any;
  
  constructor(data: any) {
    super(data.message || 'Validation error');
    this.name = 'ValidationError';
    this.statusCode = data.statusCode || data.status || 400;
    this.code = data.code || 'VALIDATION_ERROR';
    this.fields = data.fields;
  }
}

class ForbiddenError extends Error {
  statusCode: number;
  code: string;
  
  constructor(data: any) {
    super(data.message || 'Forbidden');
    this.name = 'ForbiddenError';
    this.statusCode = data.statusCode || data.status || 403;
    this.code = data.code || 'FORBIDDEN';
  }
}

// Custom base error
class HttpError extends Error {
  statusCode: number;
  code?: string;
  
  constructor(data: any) {
    super(data.message || 'HTTP Error');
    this.name = 'HttpError';
    this.statusCode = data.statusCode || data.status || 500;
    this.code = data.code;
  }
}

// Create error registry
const errorRegistry = createErrorRegistry({
  seekers: ['code', 'status'],
  
  // Custom base error for unmapped errors
  baseError: HttpError,
  
  // Optional error mapping - can use codes and/or status
  errors: {
    'NOT_FOUND': NotFoundError,
    404: NotFoundError,
    'VALIDATION_ERROR': ValidationError,
    400: ValidationError,
    // Note: FORBIDDEN will be registered dynamically
  },
  
  // Handlers with both code and status
  handlers: {
    'NOT_FOUND': (error, ctx) => {
      const req = ctx?.req;
      console.log('Not found:', {
        path: req?.path,
        method: req?.method,
        error: error.message,
      });
    },
    404: (error, ctx) => {
      // Status-based handler
      console.log('404 handler triggered');
    },
    'VALIDATION_ERROR': (error, ctx) => {
      console.log('Validation error:', error.message);
    },
    400: (error, ctx) => {
      console.log('400 handler triggered');
    },
  },
});

// Dynamic registration - register errors and handlers at runtime
errorRegistry.registerError('FORBIDDEN', ForbiddenError);
errorRegistry.registerError(403, ForbiddenError);

errorRegistry.registerHandler('FORBIDDEN', (error, ctx) => {
  console.log('Access forbidden:', error.message);
});

errorRegistry.registerHandler(403, (error, ctx) => {
  const req = ctx?.req;
  console.log('403 status handler - Forbidden access to:', req?.path);
});

const app = express();

// Global error handling middleware
app.use((err, req, res, next) => {
  // Create error from caught error
  const error = errorRegistry.createError({
    status: err.status || err.statusCode || 500,
    code: err.code,
    message: err.message,
    fields: err.fields,
  });
  
  // Global error handler
  errorRegistry.handleError(error, { req, res });
  
  res.status(error.statusCode || 500).json({
    error: error.message,
    code: error.code,
  });
});

// Example route showing error creation
app.get('/users/:id', async (req, res, next) => {
  try {
    const user = await getUserById(req.params.id);
    
    if (!user) {
      // Creating error using errorRegistry
      const error = errorRegistry.createError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
      throw error; // or return next(error)
    }
    
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// Another example - validation error creation
app.post('/users', async (req, res, next) => {
  try {
    const { email, name } = req.body;
    
    if (!email || !name) {
      // Creating validation error
      const error = errorRegistry.createError({
        code: 'VALIDATION_ERROR',
        message: 'Email and name are required',
        fields: { email: !email, name: !name },
      });
      throw error;
    }
    
    // ... create user logic
    res.status(201).json({ id: 1, email, name });
  } catch (err) {
    next(err);
  }
});

// Example using status codes
app.delete('/users/:id', async (req, res, next) => {
  try {
    const hasPermission = await checkPermission(req.user, req.params.id);
    
    if (!hasPermission) {
      // Error will use baseError (HttpError) if not in registry
      // You can also throw your own FORBIDDEN error class: throw new ForbiddenError(...)
      const error = errorRegistry.createError({
        status: 403,
        message: 'You do not have permission to delete this user',
      });
      throw error;
    }
    
    // ... delete logic
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});
```

### Error Mapping is Optional - Global Error Handling Only

```typescript
import express from 'express';
import { createErrorRegistry } from '@dang33zz/error-registry';

// Custom base error as factory function
const createHttpError = (data: any) => {
  const error = new Error(data.message || 'HTTP Error');
  (error as any).statusCode = data.statusCode || data.status || 500;
  (error as any).code = data.code;
  error.name = 'HttpError';
  return error;
};

// Error mapping is optional - can use just handlers for global error handling
const errorRegistry = createErrorRegistry({
  seekers: ['code', 'status'],
  baseError: createHttpError, // Custom base error as factory
  // No errors mapping - all errors use baseError
  handlers: {
    'NOT_FOUND': (error, ctx) => {
      const req = ctx?.req;
      console.log('Not found:', req?.path);
    },
    404: (error, ctx) => {
      console.log('404 handler triggered');
    },
    'VALIDATION_ERROR': (error, ctx) => {
      console.log('Validation error:', error.message);
    },
    400: (error, ctx) => {
      console.log('400 handler triggered');
    },
    'FORBIDDEN': (error, ctx) => {
      console.log('Access forbidden');
    },
    403: (error, ctx) => {
      const req = ctx?.req;
      console.log('403 status handler:', req?.path);
    },
  },
});

const app = express();

// Global error handling - all errors use baseError but handlers still run
app.use((err, req, res, next) => {
  const error = errorRegistry.createError({
    status: err.status || err.statusCode || 500,
    code: err.code,
    message: err.message,
  });
  
  // All errors use baseError, but handlers are still invoked
  errorRegistry.handleError(error, { req, res });
  
  res.status(error.statusCode || 500).json({
    error: error.message,
    code: error.code,
  });
});

// Example route - creating errors with optional mapping
app.get('/users/:id', async (req, res, next) => {
  try {
    const user = await getUserById(req.params.id);
    
    if (!user) {
      // Creating error - will use baseError since no mapping
      // You can also throw your own NOT_FOUND error class: throw new NotFoundError(...)
      const error = errorRegistry.createError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
      throw error;
    }
    
    res.json(user);
  } catch (err) {
    next(err);
  }
});
```

## Next.js

### Global Error Handling with Optional Mapping, Base Error, and Error Creation

```typescript
// lib/errorRegistry.ts
import { createErrorRegistry } from '@dang33zz/error-registry';

// Define custom error classes
class NotFoundError extends Error {
  statusCode: number;
  code: string;
  
  constructor(data: any) {
    super(data.message || 'Not found');
    this.name = 'NotFoundError';
    this.statusCode = data.statusCode || data.status || 404;
    this.code = data.code || 'NOT_FOUND';
  }
}

class UnauthorizedError extends Error {
  statusCode: number;
  code: string;
  
  constructor(data: any) {
    super(data.message || 'Unauthorized');
    this.name = 'UnauthorizedError';
    this.statusCode = data.statusCode || data.status || 401;
    this.code = data.code || 'UNAUTHORIZED';
  }
}

// Custom base error
class NextApiError extends Error {
  statusCode: number;
  code?: string;
  
  constructor(data: any) {
    super(data.message || 'API Error');
    this.name = 'NextApiError';
    this.statusCode = data.statusCode || data.status || 500;
    this.code = data.code;
  }
}

export const errorRegistry = createErrorRegistry({
  seekers: ['code', 'status'],
  
  // Custom base error
  baseError: NextApiError,
  
  // Optional error mapping with codes and status
  errors: {
    'NOT_FOUND': NotFoundError,
    404: NotFoundError,
    'UNAUTHORIZED': UnauthorizedError,
    401: UnauthorizedError,
  },
  
  // Handlers with both code and status
  handlers: {
    'NOT_FOUND': async (error) => {
      console.log('Not found error:', error.message);
    },
    404: async (error) => {
      console.log('404 handler:', error.message);
    },
    'UNAUTHORIZED': async (error) => {
      console.log('Unauthorized access:', error.message);
    },
    401: async (error) => {
      console.log('401 handler:', error.message);
    },
  },
});
```

### Middleware Example

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { errorRegistry } from '@/lib/errorRegistry';

export async function middleware(request: NextRequest) {
  try {
    // Example: Authentication check
    const token = request.headers.get('authorization');
    
    if (!token && request.nextUrl.pathname.startsWith('/api/protected')) {
      const error = errorRegistry.createError({
        code: 'UNAUTHORIZED',
        status: 401,
        message: 'Authentication required',
      });
      
      throw error;
    }
    
    // Continue with the request
    return NextResponse.next();
  } catch (err: any) {
    const error = errorRegistry.createError({
      status: err.status || err.statusCode || 500,
      code: err.code,
      message: err.message,
    });
    
    await errorRegistry.handleError(error, { request });
    
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode || 500 }
    );
  }
}

export const config = {
  matcher: '/api/:path*',
};
```

### App Router Route Handler Example (Next.js 13)

```typescript
// app/api/users/[id]/route.ts
import { errorRegistry } from '@/lib/errorRegistry';
import { NextResponse } from 'next/server';

// Next.js 13 uses synchronous params
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getUserById(params.id);
    
    if (!user) {
      // Creating error using errorRegistry
      const error = errorRegistry.createError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
      
      throw error;
    }
    
    return NextResponse.json(user);
  } catch (err: any) {
    const error = errorRegistry.createError({
      status: err.status || err.statusCode || 500,
      code: err.code,
      message: err.message,
    });
    
    await errorRegistry.handleError(error, { request });
    
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode || 500 }
    );
  }
}
```

### App Router Route Handler Example (Next.js 15+)

```typescript
// app/api/users/[id]/route.ts
import { errorRegistry } from '@/lib/errorRegistry';
import { NextResponse } from 'next/server';

// Next.js 15+ uses async params
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Await params in Next.js 15+
    const { id } = await params;
    const user = await getUserById(id);
    
    if (!user) {
      // Creating error using errorRegistry
      const error = errorRegistry.createError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
      
      throw error;
    }
    
    return NextResponse.json(user);
  } catch (err: any) {
    const error = errorRegistry.createError({
      status: err.status || err.statusCode || 500,
      code: err.code,
      message: err.message,
    });
    
    await errorRegistry.handleError(error, { request });
    
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode || 500 }
    );
  }
}
```

### App Router Route Handler with Error Wrapper (Next.js 15+)

For a cleaner approach, you can create a wrapper function to centralize error handling and avoid repetitive try/catch blocks:

```typescript
// lib/routeWrapper.ts
import { NextResponse } from 'next/server';
import { errorRegistry } from './errorRegistry';

export function withErrorHandler<TParams extends Record<string, string>>(
  handler: (
    request: Request,
    context: { params: Promise<TParams> | TParams }
  ) => Promise<Response>
) {
  return async (
    request: Request,
    context: { params: Promise<TParams> | TParams }
  ) => {
    try {
      return await handler(request, context);
    } catch (err: any) {
      const error = errorRegistry.createError({
        status: err.status || err.statusCode || 500,
        code: err.code,
        message: err.message,
      });
      
      await errorRegistry.handleError(error, { request });
      
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 500 }
      );
    }
  };
}
```

```typescript
// app/api/users/[id]/route.ts
import { withErrorHandler } from '@/lib/routeWrapper';
import { NextResponse } from 'next/server';
import { errorRegistry } from '@/lib/errorRegistry';

// Next.js 15+ uses async params
export const GET = withErrorHandler(async (
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) => {
  // Await params in Next.js 15+
  const { id } = await params;
  const user = await getUserById(id);
  
  if (!user) {
    // Simply throw the error - wrapper will handle it
    throw errorRegistry.createError({
      code: 'NOT_FOUND',
      message: 'User not found',
    });
  }
  
  return NextResponse.json(user);
});
```

This pattern:
- ✅ Eliminates repetitive try/catch blocks
- ✅ Centralizes error handling logic
- ✅ Works with both Next.js 13 (sync params) and Next.js 15+ (async params)
- ✅ Still invokes your registered error handlers

### Pages Router Example

```typescript
// pages/api/users/[id].ts
import { errorRegistry } from '@/lib/errorRegistry';
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { id } = req.query;
    const user = await getUserById(id as string);
    
    if (!user) {
      // Creating error using errorRegistry
      // Throw the error and let the catch block handle it
      const error = errorRegistry.createError({
        code: 'NOT_FOUND',
        message: 'User not found',
      });
      throw error;
    }
    
    res.status(200).json(user);
  } catch (err: any) {
    // Create error from caught exception
    const error = errorRegistry.createError({
      status: err.status || err.statusCode || 500,
      code: err.code,
      message: err.message,
    });
    
    // Global error handling
    await errorRegistry.handleError(error, { req, res });
    
    res.status(error.statusCode || 500).json({ error: error.message });
  }
}
```

### Error Mapping is Optional - Global Error Handling Only

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

// Error mapping is optional - can use just handlers for global error handling
export const errorRegistry = createErrorRegistry({
  seekers: ['code', 'status'],
  baseError: createNextApiError, // Custom base error as factory
  // No errors mapping - all errors use baseError
  handlers: {
    'NOT_FOUND': async (error) => {
      console.log('Not found error:', error.message);
    },
    404: async (error) => {
      console.log('404 handler:', error.message);
    },
    'UNAUTHORIZED': async (error) => {
      console.log('Unauthorized access:', error.message);
    },
    401: async (error) => {
      console.log('401 handler:', error.message);
    },
    500: async (error) => {
      await logToSentry(error);
    },
  },
});
```

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { errorRegistry } from '@/lib/errorRegistry';

export async function middleware(request: NextRequest) {
  try {
    // Example: Extract user ID from pathname or check authentication
    const userId = request.nextUrl.pathname.split('/').pop();
    
    if (userId) {
      const user = await getUserById(userId);
      
      if (!user) {
        // Creating error - will use baseError since no mapping
        // Throw the error and let the catch block handle it
        const error = errorRegistry.createError({
          code: 'NOT_FOUND',
          message: 'User not found',
        });
        throw error;
      }
    }
    
    return NextResponse.next();
  } catch (err: any) {
    const error = errorRegistry.createError({
      status: err.status || err.statusCode || 500,
      code: err.code,
      message: err.message,
    });
    
    // All errors use baseError, but handlers are still invoked
    await errorRegistry.handleError(error, { request });
    
    return NextResponse.json(
      { error: error.message },
      { status: error.statusCode || 500 }
    );
  }
}

export const config = {
  matcher: '/api/:path*',
};
```

## Validation Libraries

Error-registry can also be used with validation libraries like **Yup** and **Zod** to create and handle validation errors.

### Yup Integration Example

```typescript
import * as yup from 'yup';
import { createErrorRegistry } from '@dang33zz/error-registry';

// Custom validation error
class ValidationError extends Error {
  statusCode: number;
  code: string;
  fields?: Record<string, string[]>;
  
  constructor(data: any) {
    super(data.message || 'Validation error');
    this.name = 'ValidationError';
    this.statusCode = data.statusCode || data.status || 400;
    this.code = data.code || 'VALIDATION_ERROR';
    this.fields = data.fields;
  }
}

// Custom base error
class HttpError extends Error {
  statusCode: number;
  code?: string;
  
  constructor(data: any) {
    super(data.message || 'HTTP Error');
    this.name = 'HttpError';
    this.statusCode = data.statusCode || data.status || 500;
    this.code = data.code;
  }
}

const errorRegistry = createErrorRegistry({
  seekers: ['code', 'status'],
  baseError: HttpError,
  errors: {
    'VALIDATION_ERROR': ValidationError,
  },
  handlers: {
    'VALIDATION_ERROR': (error, ctx) => {
      console.log('Validation failed:', error.message);
    },
  },
});

// Yup schema
const userSchema = yup.object({
  email: yup.string().email().required(),
  name: yup.string().min(2).required(),
  age: yup.number().positive().integer().required(),
});

// Validation function using error-registry
async function validateUser(data: unknown) {
  try {
    return await userSchema.validate(data, { abortEarly: false });
  } catch (yupError: any) {
    // Convert Yup validation errors to error-registry format
    const fields: Record<string, string[]> = {};
    
    if (yupError.inner) {
      yupError.inner.forEach((err: any) => {
        const path = err.path || 'unknown';
        if (!fields[path]) {
          fields[path] = [];
        }
        fields[path].push(err.message);
      });
    }
    
    // Create error using error-registry
    const error = errorRegistry.createError({
      code: 'VALIDATION_ERROR',
      status: 400,
      message: 'Validation failed',
      fields,
    });
    
    // Handle error globally
    await errorRegistry.handleError(error);
    
    throw error;
  }
}

// Usage
try {
  const user = await validateUser({ email: 'invalid', name: '', age: -5 });
} catch (error) {
  // error is a ValidationError instance
  console.log(error.fields); // { email: [...], name: [...], age: [...] }
}
```

### Zod Integration Example

```typescript
import { z } from 'zod';
import { createErrorRegistry } from '@dang33zz/error-registry';

// Custom validation error
class ValidationError extends Error {
  statusCode: number;
  code: string;
  fields?: Record<string, string[]>;
  
  constructor(data: any) {
    super(data.message || 'Validation error');
    this.name = 'ValidationError';
    this.statusCode = data.statusCode || data.status || 400;
    this.code = data.code || 'VALIDATION_ERROR';
    this.fields = data.fields;
  }
}

// Custom base error
class HttpError extends Error {
  statusCode: number;
  code?: string;
  
  constructor(data: any) {
    super(data.message || 'HTTP Error');
    this.name = 'HttpError';
    this.statusCode = data.statusCode || data.status || 500;
    this.code = data.code;
  }
}

const errorRegistry = createErrorRegistry({
  seekers: ['code', 'status'],
  baseError: HttpError,
  errors: {
    'VALIDATION_ERROR': ValidationError,
  },
  handlers: {
    'VALIDATION_ERROR': (error, ctx) => {
      console.log('Validation failed:', error.message);
    },
  },
});

// Zod schema
const userSchema = z.object({
  email: z.string().email('Invalid email address'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  age: z.number().positive('Age must be positive').int('Age must be an integer'),
});

// Validation function using error-registry
async function validateUser(data: unknown) {
  try {
    return await userSchema.parse(data);
  } catch (zodError: any) {
    // Convert Zod validation errors to error-registry format
    const fields: Record<string, string[]> = {};
    
    if (zodError.errors) {
      zodError.errors.forEach((err: any) => {
        const path = err.path?.join('.') || 'unknown';
        if (!fields[path]) {
          fields[path] = [];
        }
        fields[path].push(err.message);
      });
    }
    
    // Create error using error-registry
    const error = errorRegistry.createError({
      code: 'VALIDATION_ERROR',
      status: 400,
      message: 'Validation failed',
      fields,
    });
    
    // Handle error globally
    await errorRegistry.handleError(error);
    
    throw error;
  }
}

// Usage
try {
  const user = await validateUser({ email: 'invalid', name: '', age: -5 });
} catch (error) {
  // error is a ValidationError instance
  console.log(error.fields); // { email: [...], name: [...], age: [...] }
}
```
