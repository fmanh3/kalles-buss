import { v4 as uuidv4 } from 'uuid';
import { AsyncLocalStorage } from 'async_hooks';

// Storage for both correlation IDs (tracing) and simulation run IDs
interface TraceStore {
  correlationId: string;
  runId?: string;
}

export const tracingContext = new AsyncLocalStorage<TraceStore>();

/**
 * Express Middleware that injects or generates a correlation ID for every incoming request.
 * Also supports optional simulation run ID for backtesting evaluation.
 */
export function tracingMiddleware(req: any, res: any, next: any) {
  const correlationId = (req?.headers?.['x-correlation-id'] as string) || uuidv4();
  const runId = req?.headers?.['x-simulation-run-id'] as string;
  
  // Add it to the response header for downstream tracking
  if (res && typeof res.setHeader === 'function') {
    res.setHeader('x-correlation-id', correlationId);
    if (runId) res.setHeader('x-simulation-run-id', runId);
  }

  // Run the rest of the request within this tracking context
  tracingContext.run({ correlationId, runId }, () => {
    next();
  });
}

export const getCorrelationId = () => tracingContext.getStore()?.correlationId || 'no-trace';
export const getSimulationRunId = () => tracingContext.getStore()?.runId;

/**
 * A simple Logger wrapper that automatically prepends the Correlation ID and Run ID.
 */
export const Logger = {
  info: (message: string, ...args: any[]) => {
    const runTag = getSimulationRunId() ? ` [RUN:${getSimulationRunId()}]` : '';
    console.log(`[INFO] [${getCorrelationId()}]${runTag} ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    const runTag = getSimulationRunId() ? ` [RUN:${getSimulationRunId()}]` : '';
    console.warn(`[WARN] [${getCorrelationId()}]${runTag} ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    const runTag = getSimulationRunId() ? ` [RUN:${getSimulationRunId()}]` : '';
    console.error(`[ERROR] [${getCorrelationId()}]${runTag} ${message}`, ...args);
  }
};
