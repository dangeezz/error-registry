# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-11-03

### Added

- **Variadic context arguments**: `handleError` now accepts variadic context arguments (`...ctx: any[]`) instead of a single optional context. This allows handlers to receive multiple context arguments for more flexible error handling scenarios.

  ```typescript
  // Before (still works)
  await system.handleError(error, context);
  
  // Now also supports
  await system.handleError(error, requestId, userId, timestamp);
  ```


- **New `clear` method**: Clears all registered errors and handlers from the registry.

  ```typescript
  system.clear();
  ```

- **New `unregisterError` method**: Unregisters a specific error class or factory function.

  ```typescript
  system.unregisterError("OUT_OF_STOCK");
  ```

- **New `unregisterHandler` method**: Unregisters a specific handler function.

  ```typescript
  system.unregisterHandler(404);
  ```

- **ErrorCreator type**: New exported type for error creators (factory functions or class constructors).

- **Factory function support in `registerError`**: The `registerError` method now accepts both class constructors and factory functions, matching the flexibility of `baseError` and `errors` config.

  ```typescript
  // Class constructor (existing functionality)
  system.registerError("ERROR", MyErrorClass);
  
  // Factory function (new)
  system.registerError("ERROR", (data) => new MyError(data.field1, data.field2));
  ```

- **Factory function support in `errors` config**: The `errors` configuration now accepts factory functions in addition to class constructors.

  ```typescript
  const registry = createErrorRegistry({
    errors: {
      "ERROR": (data) => new MyError(data.a, data.b, data.c)
    }
  });
  ```

### Changed

- Handler functions in config and `registerHandler` support variadic context: `(error, ...ctx: any[])`. Existing handlers that only use one optional context parameter remain compatible in most TS setups.
- `registerError` now accepts `ErrorCreator` type (factory or constructor) in addition to class constructors.

### Migration Guide

#### Handler Context Arguments

If you have handlers that use the optional context parameter, they will continue to work:

```typescript
// This still works - handlers receive variadic args, but can ignore extras
const handler = (error: Error, ctx?: { requestId: string }) => {
  // Only uses first argument if provided
};

registry.registerHandler(404, handler);
await registry.handleError(error, context); // Works
```

For handlers that want multiple context arguments:

```typescript
// Now you can pass multiple arguments
const handler = (error: Error, requestId: string, userId: string, timestamp: number) => {
  // Use all arguments
};

registry.registerHandler(404, handler);
await registry.handleError(error, requestId, userId, timestamp);
```

#### registerError with Factory Functions

If you want to use factory functions:

```typescript
// Old way (still works)
registry.registerError("ERROR", MyErrorClass);

// New way with factory
registry.registerError("ERROR", (data) => new MyError(data.field1, data.field2));
```

