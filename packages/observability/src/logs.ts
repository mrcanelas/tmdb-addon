import { redactSensitive } from '@metalayer/security';
import type { LogEntry } from './types.js';

export class BoundedLogBuffer {
  private readonly entries: LogEntry[] = [];
  private seq = 0;

  constructor(private readonly maxEntries = 500) {}

  append(input: Omit<LogEntry, 'id' | 'at'> & { at?: string }): LogEntry {
    const entry: LogEntry = {
      id: `log_${++this.seq}`,
      level: input.level,
      message: input.message,
      correlationId: input.correlationId,
      at: input.at ?? new Date().toISOString(),
      context: input.context
        ? (redactSensitive(input.context) as Record<string, unknown>)
        : undefined,
    };
    this.entries.push(entry);
    while (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
    return entry;
  }

  list(options?: {
    level?: LogEntry['level'];
    limit?: number;
    correlationId?: string;
  }): LogEntry[] {
    let items = [...this.entries];
    if (options?.level) {
      items = items.filter((entry) => entry.level === options.level);
    }
    if (options?.correlationId) {
      items = items.filter((entry) => entry.correlationId === options.correlationId);
    }
    const limit = options?.limit ?? 100;
    return items.slice(-limit).reverse();
  }

  clear(): void {
    this.entries.length = 0;
  }
}
