/**
 * Type for error creators - either a factory function or a class constructor.
 * 
 * @template TErrorData - The type of error data
 * @template TError - The base error class type
 */
export type ErrorCreator<TErrorData = unknown, TError extends Error = Error> =
  ((data: TErrorData) => TError) | (new (data: TErrorData) => TError);

/**
 * Helper type to extract the error type from an ErrorCreator.
 * Works for both factory functions and class constructors.
 * 
 * @template T - The ErrorCreator type
 */
type ExtractErrorType<T> = 
  T extends (data: any) => infer E 
    ? E extends Error 
      ? E 
      : never
    : T extends new (data: any) => infer E 
      ? E extends Error 
        ? E 
        : never
      : never;

/**
 * Maps error codes to their specific error types based on the errors registry.
 * 
 * @template TErrors - The errors registry record
 */
type ErrorTypeMap<TErrors extends Record<string | number, ErrorCreator<any, any>>> = {
  [K in keyof TErrors]: ExtractErrorType<TErrors[K]>;
};

/**
 * Configuration options for the error system.
 * 
 * @template TErrorData - The type of error data passed to createError and error constructors
 * @template TError - The base error class type
 * @template TErrors - The errors registry mapping codes to error creators (for type-safe handlers)
 */
export interface Config<
  TErrorData = unknown, 
  TError extends Error = Error,
  TErrors extends Record<string | number, ErrorCreator<TErrorData, any>> = Record<string | number, ErrorCreator<TErrorData, TError>>
> {
  /**
   * Array of property names to search for error codes in error data.
   * The system will check these properties in order to find the key for registry lookup.
   * 
   * @default ["code", "status"]
   * 
   * @example
   * seekers: ["errorCode", "httpStatus", "code"]
   */
  seekers?: string[];

  /**
   * Factory function or class constructor to create the base error class when no custom error is found in the registry.
   * This allows users to use their own base error class instead of the generic Error.
   * 
   * - **Factory function**: Provides full control over error creation, useful for constructors with non-standard signatures.
   *   Example: `(data) => new MyError(data.a, data.b, data.c)`
   * 
   * - **Class constructor**: Convenience for standard constructors that accept `(data: TErrorData)`.
   *   Example: `ApiError`
   * 
   * @param data - The error data object
   * @returns An instance of the base error class
   * 
   * @example
   * // Using a factory function (full control)
   * baseError: (data) => new MyError(data.field1, data.field2, data.field3)
   * 
   * // Using a class constructor directly (convenience)
   * baseError: ApiError
   */
  baseError?: ((data: TErrorData) => TError) | (new (data: TErrorData) => TError);

  /**
   * Registry mapping error codes or status codes to custom error classes or factory functions.
   * When an error is created, the system will first check this registry for a matching creator.
   * 
   * The types in this registry are used to provide type-safe handlers - handlers for specific
   * error codes will receive the corresponding error type instead of the generic TError.
   * 
   * - **Class constructor**: Standard constructors that accept `(data: TErrorData)`.
   *   Example: `ProductNotFoundError`
   * 
   * - **Factory function**: Provides full control over error creation.
   *   Example: `(data) => new MyError(data.a, data.b, data.c)`
   * 
   * @example
   * errors: {
   *   "PRODUCT_NOT_FOUND": ProductNotFoundError,
   *   404: NotFoundError,
   *   500: (data) => new ServerError(data.message, data.statusCode)
   * }
   */
  errors?: TErrors;

  /**
   * Registry mapping error codes or status codes to handler functions.
   * When handleError is called, the system will invoke the matching handler.
   * 
   * Handlers for error codes defined in the `errors` registry will automatically receive
   * the specific error type instead of the generic TError. This provides type safety and
   * better IDE autocomplete.
   * 
   * @example
   * handlers: {
   *   401: (error) => redirectToLogin(),
   *   404: (error) => {
   *     // If 404 is mapped to NotFoundError in errors, error is typed as NotFoundError
   *     console.log(error.code); // TypeScript knows this property exists
   *   },
   *   500: (error) => logToSentry(error)
   * }
   */
  handlers?: {
    [K in keyof ErrorTypeMap<TErrors>]?: (
      error: ErrorTypeMap<TErrors>[K], 
      ...ctx: any[]
    ) => void | Promise<void>;
  } & Record<string | number, (error: TError, ...ctx: any[]) => void | Promise<void>>;
}

/**
 * Return type of the createErrorRegistry function.
 * 
 * @template TErrorData - The type of error data
 * @template TError - The base error class type
 */
export interface ErrorRegistry<TErrorData = unknown, TError extends Error = Error> {
  /**
   * Creates an error instance from error data.
   * 
   * The function will:
   * 1. Use the seekers array to find a key in the data
   * 2. Check the error registry for a custom error class
   * 3. Fall back to baseError if provided
   * 4. Fall back to generic Error as last resort
   * 
   * @param data - Error data object
   * @returns Error instance (custom class, base class, or generic Error)
   * 
   * @example
   * const error = system.createError({ code: "NOT_FOUND", message: "Resource not found" });
   */
  createError: (data: TErrorData) => TError;

  /**
   * Handles an error by invoking the registered handler for the error's code/status.
   * 
   * The function searches for a handler by checking each seeker property on the error object.
   * If no handler is found via seekers, it falls back to using the error's constructor name.
   * 
   * @param error - The error instance to handle
   * @param ctx - Variadic context arguments passed to the handler
   * @returns Promise that resolves when handler completes
   * 
   * @example
   * await system.handleError(error, requestId, userId, timestamp);
   */
  handleError: (error: TError, ...ctx: any[]) => Promise<void>;

  /**
   * Registers a custom error class or factory function for a specific error code or status code.
   * 
   * - **Class constructor**: Standard constructors that accept `(data: TErrorData)`.
   *   Example: `OutOfStockError`
   * 
   * - **Factory function**: Provides full control over error creation.
   *   Example: `(data) => new MyError(data.a, data.b, data.c)`
   * 
   * @param key - Error code or status code (string or number)
   * @param creator - Error class constructor or factory function
   * 
   * @example
   * system.registerError("OUT_OF_STOCK", OutOfStockError);
   * system.registerError("CUSTOM", (data) => new CustomError(data.field1, data.field2));
   */
  registerError: (key: string | number, creator: ErrorCreator<TErrorData, TError>) => void;

  /**
   * Registers a handler function for a specific error code or status code.
   * 
   * @param key - Error code or status code (string or number)
   * @param fn - Handler function that receives the error and variadic context arguments
   * 
   * @example
   * system.registerHandler(401, (error, userId, sessionId) => {
   *   localStorage.removeItem("token");
   *   window.location.href = "/login";
   * });
   */
  registerHandler: (key: string | number, fn: (error: TError, ...ctx: any[]) => void | Promise<void>) => void;
}

/**
 * Creates a configurable error registry with error and handler mappings.
 * 
 * The registry provides:
 * - Flexible error code lookup via customizable seekers
 * - Registry pattern for mapping codes to custom error classes
 * - Global error handlers for centralized error handling
 * - Runtime registration of errors and handlers
 * 
 * @param config - Configuration object with seekers, baseError, errors, and handlers
 * @returns Error registry instance with createError, handleError, and registration methods
 * 
 * @template TErrorData - The type of error data
 * @template TError - The base error class type
 * 
 * @example
 * ```typescript
 * const errorRegistry = createErrorRegistry({
 *   seekers: ["code", "status"],
 *   baseError: (data) => new ApiError(data),
 *   errors: {
 *     "OUT_OF_STOCK": OutOfStockError,
 *     404: NotFoundError,
 *   },
 *   handlers: {
 *     404: (error) => console.log("Not found:", error),
 *     500: (error) => sendToSentry(error),
 *   },
 * });
 * 
 * // Create error
 * const error = errorRegistry.createError({ code: "OUT_OF_STOCK", message: "..." });
 * 
 * // Handle error
 * await errorRegistry.handleError(error);
 * 
 * // Dynamic registration
 * errorRegistry.registerError("NEW_CODE", NewError);
 * errorRegistry.registerHandler("NEW_CODE", (error) => handleNewError(error));
 * ```
 */
export function createErrorRegistry<
  TErrorData = unknown, 
  TError extends Error = Error,
  TErrors extends Record<string | number, ErrorCreator<TErrorData, any>> = Record<string | number, ErrorCreator<TErrorData, TError>>
>(
  config?: Config<TErrorData, TError, TErrors>
): ErrorRegistry<TErrorData, TError> {
  const defaultSeekers = ["code", "status"];
  const opts: Config<TErrorData, TError> = {
    errors: {},
    handlers: {},
    ...(config ?? {}),
    // Ensure seekers defaults to ["code", "status"] if not provided or empty
    seekers: config?.seekers && config.seekers.length > 0 ? config.seekers : defaultSeekers,
  };
  const { errors, handlers, seekers, baseError } = opts;

  const errorRegistry = new Map<string, ErrorCreator<TErrorData, TError>>();
  const handlerRegistry = new Map<string, (error: TError, ...ctx: any[]) => void | Promise<void>>();

  // Helper function to create error from creator (factory or constructor)
  const createErrorFromCreator = (creator: ErrorCreator<TErrorData, TError>, data: TErrorData): TError => {
    // Check if it's a class constructor (has prototype) vs a factory function
    if (typeof creator === 'function' && 'prototype' in creator) {
      // It's a class constructor with standard signature: new (data: TErrorData) => TError
      return new (creator as new (data: TErrorData) => TError)(data);
    } else {
      // It's a factory function - user has full control over how to create the error
      return (creator as (data: TErrorData) => TError)(data);
    }
  };

  const create = (data: TErrorData): TError => {
    // Try each seeker in priority order until we find a matching error creator
    if (seekers && seekers.length > 0) {
      for (const seeker of seekers) {
        const dataRecord = data as Record<string, unknown>;
        const value = dataRecord?.[seeker];
        if (value != null) {
          const key = String(value);
          const creator = errorRegistry.get(key);
          if (creator) {
            return createErrorFromCreator(creator, data);
          }
        }
      }
    }

    // Second: Fall back to user's base class if provided
    if (baseError) {
      return createErrorFromCreator(baseError, data);
    }

    // Last resort: Generic Error
    // Type assertion needed because generic TError might not extend Error in strict typing
    return new Error((data as { message?: string })?.message ?? "Unknown error") as TError;
  };

  // Register provided errors and handlers
  if (errors) {
    for (const [code, creator] of Object.entries(errors)) {
      errorRegistry.set(String(code), creator as ErrorCreator<TErrorData, TError>);
    }
  }

  if (handlers) {
    for (const [code, handler] of Object.entries(handlers)) {
      handlerRegistry.set(String(code), handler as (error: TError, ...ctx: any[]) => void | Promise<void>);
    }
  }

  const handleError = async (error: TError, ...ctx: any[]): Promise<void> => {
    // Try each seeker in priority order until we find a matching handler
    if (seekers && seekers.length > 0) {
      for (const seeker of seekers) {
        const errorRecord = error as Record<string, unknown>;
        const value = errorRecord?.[seeker];
        if (value != null) {
          const key = String(value);
          const handler = handlerRegistry.get(key);
          if (handler) {
            await handler(error, ...ctx);
            return;
          }
        }
      }
    }

    // Fallback to constructor name if no seeker found a matching handler
    const constructorName = (error.constructor as { name?: string })?.name;
    if (constructorName) {
      const handler = handlerRegistry.get(constructorName);
      if (handler) {
        await handler(error, ...ctx);
      }
    }
  };

  return {
    createError: create,
    handleError,
    registerError: (key: string | number, creator: ErrorCreator<TErrorData, TError>): void => {
      errorRegistry.set(String(key), creator);
    },
    registerHandler: (key: string | number, fn: (error: TError, ...ctx: any[]) => void | Promise<void>): void => {
      handlerRegistry.set(String(key), fn);
    },
  };
}
