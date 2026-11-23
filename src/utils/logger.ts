type LogContext = Record<string, unknown> | unknown;

function formatContext(context?: LogContext): string {
  if (context === undefined) return '';
  if (context instanceof Error) {
    return ` | ${context.message}`;
  }
  try {
    return ` | ${JSON.stringify(context)}`;
  } catch {
    return ' | [unserializable context]';
  }
}

export const logger = {
  info(message: string, context?: LogContext): void {
    console.info(`[PrecoBrasil] ${message}${formatContext(context)}`);
  },
  warn(message: string, context?: LogContext): void {
    console.warn(`[PrecoBrasil] ${message}${formatContext(context)}`);
  },
  error(message: string, context?: LogContext): void {
    console.error(`[PrecoBrasil] ${message}${formatContext(context)}`);
  },
};
