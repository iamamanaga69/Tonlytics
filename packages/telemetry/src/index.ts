import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';
const logLevel = process.env.LOG_LEVEL || 'info';

// Configure Pino with pretty print in development for readable logs
export const logger = pino({
  level: logLevel,
  transport: !isProduction
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname'
        }
      }
    : undefined
});

/**
 * Log an informational message with structured metadata.
 */
export function logInfo(message: string, meta?: Record<string, any>): void {
  if (meta) {
    logger.info(meta, message);
  } else {
    logger.info(message);
  }
}

/**
 * Log a warning message with structured metadata.
 */
export function logWarn(message: string, meta?: Record<string, any>): void {
  if (meta) {
    logger.warn(meta, message);
  } else {
    logger.warn(message);
  }
}

/**
 * Log an error message with structured metadata and stack traces.
 */
export function logError(message: string, error?: unknown, meta?: Record<string, any>): void {
  const errMeta = error instanceof Error 
    ? { err: { message: error.message, stack: error.stack } }
    : { err: error };

  logger.error({ ...meta, ...errMeta }, message);
}

/**
 * Log a debugging message with structured metadata.
 */
export function logDebug(message: string, meta?: Record<string, any>): void {
  if (meta) {
    logger.debug(meta, message);
  } else {
    logger.debug(message);
  }
}
