import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createErrorRegistry, type Config, type ErrorRegistry } from './errorRegistry';

describe('createErrorRegistry', () => {
  describe('basic functionality', () => {
    it('should create an error registry with default configuration', () => {
      const registry = createErrorRegistry();
      expect(registry).toBeDefined();
      expect(registry.createError).toBeDefined();
      expect(registry.handleError).toBeDefined();
      expect(registry.registerError).toBeDefined();
      expect(registry.registerHandler).toBeDefined();
    });

    it('should create a generic Error when no configuration is provided', () => {
      const registry = createErrorRegistry();
      const error = registry.createError({ message: 'Test error' });
      
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test error');
    });

    it('should create a generic Error with default message when message is missing', () => {
      const registry = createErrorRegistry();
      const error = registry.createError({});
      
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Unknown error');
    });
  });

  describe('error registration', () => {
    class NotFoundError extends Error {
      constructor(data: any) {
        super(data.message);
        this.name = 'NotFoundError';
        (this as any).code = data.code;
      }
    }

    class ValidationError extends Error {
      constructor(data: any) {
        super(data.message);
        this.name = 'ValidationError';
        (this as any).code = data.code;
      }
    }

    it('should create custom error class from registry using string code', () => {
      const registry = createErrorRegistry({
        errors: {
          'NOT_FOUND': NotFoundError,
          'VALIDATION_ERROR': ValidationError,
        },
      });

      const error = registry.createError({ code: 'NOT_FOUND', message: 'Not found' });
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error.message).toBe('Not found');
    });

    it('should create custom error class from registry using number status', () => {
      const registry = createErrorRegistry({
        errors: {
          404: NotFoundError,
          400: ValidationError,
        },
      });

      const error = registry.createError({ status: 404, message: 'Not found' });
      expect(error).toBeInstanceOf(NotFoundError);
    });

    it('should prioritize first seeker when multiple seekers match', () => {
      class FirstError extends Error {
        constructor(data: any) {
          super(data.message);
          this.name = 'FirstError';
        }
      }

      class SecondError extends Error {
        constructor(data: any) {
          super(data.message);
          this.name = 'SecondError';
        }
      }

      const registry = createErrorRegistry({
        seekers: ['firstCode', 'secondCode'],
        errors: {
          'FIRST': FirstError,
          'SECOND': SecondError,
        },
      });

      const error = registry.createError({
        firstCode: 'FIRST',
        secondCode: 'SECOND',
        message: 'Test',
      });

      expect(error).toBeInstanceOf(FirstError);
    });

    it('should allow dynamic error registration', () => {
      class DynamicError extends Error {
        constructor(data: any) {
          super(data.message);
          this.name = 'DynamicError';
        }
      }

      const registry = createErrorRegistry();
      registry.registerError('DYNAMIC', DynamicError);

      const error = registry.createError({ code: 'DYNAMIC', message: 'Dynamic' });
      expect(error).toBeInstanceOf(DynamicError);
    });

    it('should allow dynamic error registration with number key', () => {
      class StatusError extends Error {
        constructor(data: any) {
          super(data.message);
          this.name = 'StatusError';
        }
      }

      const registry = createErrorRegistry();
      registry.registerError(500, StatusError);

      const error = registry.createError({ status: 500, message: 'Server error' });
      expect(error).toBeInstanceOf(StatusError);
    });
  });

  describe('base error factory', () => {
    class CustomBaseError extends Error {
      code: string;
      constructor(data: { code: string; message: string }) {
        super(data.message);
        this.name = 'CustomBaseError';
        this.code = data.code;
      }
    }

    it('should use base error class when no registry match is found', () => {
      const registry = createErrorRegistry({
        baseError: CustomBaseError,
      });

      const error = registry.createError({ code: 'UNKNOWN', message: 'Unknown error' });
      expect(error).toBeInstanceOf(CustomBaseError);
      expect((error as CustomBaseError).code).toBe('UNKNOWN');
    });

    it('should use base error class constructor when provided as class', () => {
      const registry = createErrorRegistry({
        baseError: CustomBaseError,
      });

      const error = registry.createError({ code: 'TEST', message: 'Test' });
      expect(error).toBeInstanceOf(CustomBaseError);
    });

    it('should use base error factory function when provided as function', () => {
      class FactoryError extends Error {
        a: string;
        b: number;
        c: boolean;
        
        constructor(a: string, b: number, c: boolean) {
          super(`${a}-${b}-${c}`);
          this.a = a;
          this.b = b;
          this.c = c;
        }
      }

      const registry = createErrorRegistry({
        baseError: (data: { a: string; b: number; c: boolean }) => {
          return new FactoryError(data.a, data.b, data.c);
        },
      });

      const error = registry.createError({ a: 'test', b: 123, c: true });
      expect(error).toBeInstanceOf(FactoryError);
      expect((error as FactoryError).a).toBe('test');
      expect((error as FactoryError).b).toBe(123);
      expect((error as FactoryError).c).toBe(true);
    });

    it('should prefer registry error over base error', () => {
      class RegistryError extends Error {
        constructor(data: any) {
          super(data.message);
          this.name = 'RegistryError';
        }
      }

      const registry = createErrorRegistry({
        baseError: CustomBaseError,
        errors: {
          'REGISTRY': RegistryError,
        },
      });

      const error = registry.createError({ code: 'REGISTRY', message: 'Test' });
      expect(error).toBeInstanceOf(RegistryError);
      expect(error).not.toBeInstanceOf(CustomBaseError);
    });
  });

  describe('custom seekers', () => {
    class CustomError extends Error {
      constructor(data: any) {
        super(data.message);
        this.name = 'CustomError';
      }
    }

    it('should use custom seekers', () => {
      const registry = createErrorRegistry({
        seekers: ['errorCode', 'httpStatus'],
        errors: {
          'CUSTOM': CustomError,
        },
      });

      const error = registry.createError({ errorCode: 'CUSTOM', message: 'Test' });
      expect(error).toBeInstanceOf(CustomError);
    });

    it('should use custom seekers in order', () => {
      class FirstError extends Error {
        constructor(data: any) {
          super(data.message);
          this.name = 'FirstError';
        }
      }

      class SecondError extends Error {
        constructor(data: any) {
          super(data.message);
          this.name = 'SecondError';
        }
      }

      const registry = createErrorRegistry({
        seekers: ['second', 'first'],
        errors: {
          'FIRST': FirstError,
          'SECOND': SecondError,
        },
      });

      const error1 = registry.createError({ first: 'FIRST', message: 'Test' });
      expect(error1).toBeInstanceOf(FirstError);

      const error2 = registry.createError({ second: 'SECOND', message: 'Test' });
      expect(error2).toBeInstanceOf(SecondError);
    });

    it('should default to ["code", "status"] when seekers is empty array', () => {
      const registry = createErrorRegistry({
        seekers: [],
        errors: {
          'TEST': CustomError,
        },
      });

      const error = registry.createError({ code: 'TEST', message: 'Test' });
      expect(error).toBeInstanceOf(CustomError);
    });
  });

  describe('error handling', () => {
    class TestError extends Error {
      code: string;
      constructor(data: { code: string; message: string }) {
        super(data.message);
        this.name = 'TestError';
        this.code = data.code;
      }
    }

    it('should call registered handler for error code', async () => {
      const handler = vi.fn();
      const registry = createErrorRegistry({
        errors: {
          'TEST': TestError,
        },
        handlers: {
          'TEST': handler,
        },
      });

      const error = registry.createError({ code: 'TEST', message: 'Test error' });
      await registry.handleError(error);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(handler).toHaveBeenCalledWith(error);
    });

    it('should call registered handler with context', async () => {
      const handler = vi.fn();
      const registry = createErrorRegistry({
        errors: {
          'TEST': TestError,
        },
        handlers: {
          'TEST': handler,
        },
      });

      const error = registry.createError({ code: 'TEST', message: 'Test error' });
      const ctx = { requestId: 'abc123', userId: 'user456' };
      await registry.handleError(error, ctx);

      expect(handler).toHaveBeenCalledWith(error, ctx);
    });

    it('should call registered handler with multiple context arguments', async () => {
      const handler = vi.fn();
      const registry = createErrorRegistry({
        errors: {
          'TEST': TestError,
        },
        handlers: {
          'TEST': handler,
        },
      });

      const error = registry.createError({ code: 'TEST', message: 'Test error' });
      const requestId = 'abc123';
      const userId = 'user456';
      const timestamp = Date.now();
      await registry.handleError(error, requestId, userId, timestamp);

      expect(handler).toHaveBeenCalledWith(error, requestId, userId, timestamp);
    });

    it('should handle async handlers', async () => {
      let handled = false;
      const handler = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        handled = true;
      });

      const registry = createErrorRegistry({
        errors: {
          'TEST': TestError,
        },
        handlers: {
          'TEST': handler,
        },
      });

      const error = registry.createError({ code: 'TEST', message: 'Test error' });
      await registry.handleError(error);

      expect(handled).toBe(true);
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle number-based handlers', async () => {
      const handler = vi.fn();
      const registry = createErrorRegistry({
        handlers: {
          404: handler,
        },
      });

      const error = new Error('Not found');
      (error as any).status = 404;
      await registry.handleError(error);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should use first matching seeker for handler lookup', async () => {
      const firstHandler = vi.fn();
      const secondHandler = vi.fn();

      const registry = createErrorRegistry({
        seekers: ['firstCode', 'secondCode'],
        handlers: {
          'FIRST': firstHandler,
          'SECOND': secondHandler,
        },
      });

      const error = {
        firstCode: 'FIRST',
        secondCode: 'SECOND',
        message: 'Test',
      } as any;
      await registry.handleError(error);

      expect(firstHandler).toHaveBeenCalledTimes(1);
      expect(secondHandler).not.toHaveBeenCalled();
    });

    it('should fallback to constructor name when no seeker matches', async () => {
      class NamedError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'NamedError';
        }
      }

      const handler = vi.fn();
      const registry = createErrorRegistry({
        handlers: {
          'NamedError': handler,
        },
      });

      const error = new NamedError('Test');
      await registry.handleError(error);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should not throw when no handler is found', async () => {
      const registry = createErrorRegistry();
      const error = registry.createError({ message: 'Test' });

      await expect(registry.handleError(error)).resolves.not.toThrow();
    });

    it('should allow dynamic handler registration', async () => {
      const handler = vi.fn();
      const registry = createErrorRegistry({
        errors: {
          'TEST': TestError,
        },
      });

      registry.registerHandler('TEST', handler);

      const error = registry.createError({ code: 'TEST', message: 'Test error' });
      await registry.handleError(error);

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle errors with null/undefined code values gracefully', async () => {
      const registry = createErrorRegistry();
      const error = registry.createError({ code: null, message: 'Test' } as any);

      await expect(registry.handleError(error)).resolves.not.toThrow();
    });
  });

  describe('edge cases', () => {
    it('should handle empty config object', () => {
      const registry = createErrorRegistry({});
      const error = registry.createError({ message: 'Test' });
      expect(error).toBeInstanceOf(Error);
    });

    it('should handle data with null values', () => {
      const registry = createErrorRegistry();
      const error = registry.createError({ code: null, message: 'Test' } as any);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test');
    });

    it('should handle data with undefined values', () => {
      const registry = createErrorRegistry();
      const error = registry.createError({ code: undefined, message: 'Test' } as any);
      expect(error).toBeInstanceOf(Error);
      expect(error.message).toBe('Test');
    });

    it('should convert number codes to strings for registry lookup', () => {
      class NumberError extends Error {
        constructor(data: any) {
          super(data.message);
          this.name = 'NumberError';
        }
      }

      const registry = createErrorRegistry({
        errors: {
          404: NumberError,
        },
      });

      const error = registry.createError({ status: 404, message: 'Not found' });
      expect(error).toBeInstanceOf(NumberError);
    });

    it('should handle overwriting registered errors', () => {
      class FirstError extends Error {
        constructor(data: any) {
          super(data.message);
          this.name = 'FirstError';
        }
      }

      class SecondError extends Error {
        constructor(data: any) {
          super(data.message);
          this.name = 'SecondError';
        }
      }

      const registry = createErrorRegistry({
        errors: {
          'TEST': FirstError,
        },
      });

      let error = registry.createError({ code: 'TEST', message: 'Test' });
      expect(error).toBeInstanceOf(FirstError);

      registry.registerError('TEST', SecondError);
      error = registry.createError({ code: 'TEST', message: 'Test' });
      expect(error).toBeInstanceOf(SecondError);
    });

    it('should handle overwriting registered handlers', async () => {
      const firstHandler = vi.fn();
      const secondHandler = vi.fn();

      const registry = createErrorRegistry({
        handlers: {
          'TEST': firstHandler,
        },
      });

      const error = { code: 'TEST', message: 'Test' } as any;
      await registry.handleError(error);
      expect(firstHandler).toHaveBeenCalledTimes(1);

      registry.registerHandler('TEST', secondHandler);
      await registry.handleError(error);
      expect(firstHandler).toHaveBeenCalledTimes(1);
      expect(secondHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('type safety', () => {
    it('should work with typed error data', () => {
      interface MyErrorData {
        code: string;
        message: string;
        timestamp: number;
      }

      class TypedError extends Error {
        code: string;
        timestamp: number;

        constructor(data: MyErrorData) {
          super(data.message);
          this.code = data.code;
          this.timestamp = data.timestamp;
        }
      }

      const registry = createErrorRegistry<MyErrorData, TypedError>({
        baseError: TypedError,
      });

      const error = registry.createError({
        code: 'TEST',
        message: 'Test',
        timestamp: Date.now(),
      });

      expect(error).toBeInstanceOf(TypedError);
      expect(error.code).toBe('TEST');
    });
  });

  describe('error creator factory functions', () => {
    it('should support factory functions in errors config', () => {
      class FactoryError extends Error {
        a: string;
        b: number;
        c: boolean;

        constructor(a: string, b: number, c: boolean) {
          super(`${a}-${b}-${c}`);
          this.a = a;
          this.b = b;
          this.c = c;
        }
      }

      const registry = createErrorRegistry({
        errors: {
          'FACTORY': (data: { a: string; b: number; c: boolean }) => {
            return new FactoryError(data.a, data.b, data.c);
          },
        },
      });

      const error = registry.createError({ a: 'test', b: 123, c: true, code: 'FACTORY' } as any);
      expect(error).toBeInstanceOf(FactoryError);
      expect((error as FactoryError).a).toBe('test');
      expect((error as FactoryError).b).toBe(123);
      expect((error as FactoryError).c).toBe(true);
    });

    it('should support factory functions in registerError', () => {
      class FactoryError extends Error {
        field1: string;
        field2: number;

        constructor(field1: string, field2: number) {
          super(`${field1}-${field2}`);
          this.field1 = field1;
          this.field2 = field2;
        }
      }

      const registry = createErrorRegistry<{ field1: string; field2: number; code?: string }, FactoryError>();
      registry.registerError('FACTORY', (data: { field1: string; field2: number }) => {
        return new FactoryError(data.field1, data.field2);
      });

      const error = registry.createError({ field1: 'test', field2: 456, code: 'FACTORY' } as any);
      expect(error).toBeInstanceOf(FactoryError);
      expect((error as FactoryError).field1).toBe('test');
      expect((error as FactoryError).field2).toBe(456);
    });
  });

  describe('clear, unregisterError, unregisterHandler', () => {
    class TestError extends Error {
      constructor(data: any) {
        super(data.message);
        this.name = 'TestError';
      }
    }

    it('should unregister an error', () => {
      const registry = createErrorRegistry({
        errors: {
          'TEST': TestError,
        },
      });

      let error = registry.createError({ code: 'TEST', message: 'Test' });
      expect(error).toBeInstanceOf(TestError);

      registry.unregisterError('TEST');
      error = registry.createError({ code: 'TEST', message: 'Test' });
      expect(error).not.toBeInstanceOf(TestError);
      expect(error).toBeInstanceOf(Error);
    });

    it('should unregister a handler', async () => {
      const handler = vi.fn();
      const registry = createErrorRegistry({
        handlers: {
          'TEST': handler,
        },
      });

      const error = { code: 'TEST', message: 'Test' } as any;
      await registry.handleError(error);
      expect(handler).toHaveBeenCalledTimes(1);

      registry.unregisterHandler('TEST');
      await registry.handleError(error);
      expect(handler).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it('should clear all errors and handlers', async () => {
      class Error1 extends Error {
        constructor(data: any) {
          super(data.message);
        }
      }
      class Error2 extends Error {
        constructor(data: any) {
          super(data.message);
        }
      }

      const handler1 = vi.fn();
      const handler2 = vi.fn();

      const registry = createErrorRegistry({
        errors: {
          'ERROR1': Error1,
          'ERROR2': Error2,
        },
        handlers: {
          'ERROR1': handler1,
          'ERROR2': handler2,
        },
      });

      let error = registry.createError({ code: 'ERROR1', message: 'Test' });
      expect(error).toBeInstanceOf(Error1);

      error = registry.createError({ code: 'ERROR2', message: 'Test' });
      expect(error).toBeInstanceOf(Error2);

      registry.clear();

      error = registry.createError({ code: 'ERROR1', message: 'Test' });
      expect(error).not.toBeInstanceOf(Error1);
      expect(error).toBeInstanceOf(Error);

      error = registry.createError({ code: 'ERROR2', message: 'Test' });
      expect(error).not.toBeInstanceOf(Error2);
      expect(error).toBeInstanceOf(Error);

      const testError = { code: 'ERROR1', message: 'Test' } as any;
      await registry.handleError(testError);
      expect(handler1).not.toHaveBeenCalled();

      const testError2 = { code: 'ERROR2', message: 'Test' } as any;
      await registry.handleError(testError2);
      expect(handler2).not.toHaveBeenCalled();
    });
  });

});

