const isProduction = process.env.NODE_ENV === 'production';

interface LogOptions {
  module?: string;
  context?: Record<string, unknown>;
}

export function logError(message: string, options: LogOptions = {}): void {
  const { module = 'app', context } = options;
  const log = {
    level: 'ERROR',
    module,
    message,
    context,
    timestamp: new Date().toISOString(),
  };
  console.error(JSON.stringify(log));
}

export function logWarn(message: string, options: LogOptions = {}): void {
  const { module = 'app', context } = options;
  const log = {
    level: 'WARN',
    module,
    message,
    context,
    timestamp: new Date().toISOString(),
  };
  console.warn(JSON.stringify(log));
}

export function logInfo(message: string, options: LogOptions = {}): void {
  if (isProduction) return;
  const { module = 'app', context } = options;
  const log = {
    level: 'INFO',
    module,
    message,
    context,
    timestamp: new Date().toISOString(),
  };
  console.log(JSON.stringify(log));
}

export function logDebug(message: string, options: LogOptions = {}): void {
  if (isProduction) return;
  const { module = 'app', context } = options;
  const log = {
    level: 'DEBUG',
    module,
    message,
    context,
    timestamp: new Date().toISOString(),
  };
  console.debug(JSON.stringify(log));
}