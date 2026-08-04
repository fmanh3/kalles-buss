import { AsyncLocalStorage } from 'async_hooks';
export declare const tracingContext: AsyncLocalStorage<string>;
/**
 * Express Middleware that injects or generates a correlation ID for every incoming request.
 */
export declare function tracingMiddleware(req: any, res: any, next: any): void;
/**
 * A simple Logger wrapper that automatically prepends the Correlation ID.
 */
export declare const Logger: {
    info: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    error: (message: string, ...args: any[]) => void;
};
