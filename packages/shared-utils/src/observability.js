"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.tracingContext = void 0;
exports.tracingMiddleware = tracingMiddleware;
const uuid_1 = require("uuid");
const async_hooks_1 = require("async_hooks");
// AsyncLocalStorage allows us to pass the correlationId down the call stack
// without having to pass it explicitly to every function.
exports.tracingContext = new async_hooks_1.AsyncLocalStorage();
/**
 * Express Middleware that injects or generates a correlation ID for every incoming request.
 */
function tracingMiddleware(req, res, next) {
    const correlationId = req?.headers?.['x-correlation-id'] || (0, uuid_1.v4)();
    // Add it to the response header for downstream tracking
    if (res && typeof res.setHeader === 'function') {
        res.setHeader('x-correlation-id', correlationId);
    }
    // Run the rest of the request within this tracking context
    exports.tracingContext.run(correlationId, () => {
        next();
    });
}
/**
 * A simple Logger wrapper that automatically prepends the Correlation ID.
 */
exports.Logger = {
    info: (message, ...args) => {
        const traceId = exports.tracingContext.getStore() || 'no-trace';
        console.log(`[INFO] [${traceId}] ${message}`, ...args);
    },
    warn: (message, ...args) => {
        const traceId = exports.tracingContext.getStore() || 'no-trace';
        console.warn(`[WARN] [${traceId}] ${message}`, ...args);
    },
    error: (message, ...args) => {
        const traceId = exports.tracingContext.getStore() || 'no-trace';
        console.error(`[ERROR] [${traceId}] ${message}`, ...args);
    }
};
//# sourceMappingURL=observability.js.map