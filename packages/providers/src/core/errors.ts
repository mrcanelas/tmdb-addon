export type ProviderErrorKind =
  | 'timeout'
  | 'rate_limited'
  | 'auth'
  | 'not_found'
  | 'validation'
  | 'network'
  | 'upstream'
  | 'circuit_open'
  | 'unsupported';

export class ProviderError extends Error {
  readonly code: ProviderErrorKind;
  readonly providerId: string;
  readonly retryable: boolean;
  readonly status?: number;
  readonly cause?: unknown;

  constructor(options: {
    code: ProviderErrorKind;
    providerId: string;
    message: string;
    retryable?: boolean;
    status?: number;
    cause?: unknown;
  }) {
    super(options.message);
    this.name = 'ProviderError';
    this.code = options.code;
    this.providerId = options.providerId;
    this.retryable =
      options.retryable ??
      (options.code === 'timeout' ||
        options.code === 'rate_limited' ||
        options.code === 'network' ||
        options.code === 'upstream');
    this.status = options.status;
    this.cause = options.cause;
  }
}

export function classifyHttpStatus(
  status: number,
  providerId: string,
  message?: string,
): ProviderError {
  if (status === 401 || status === 403) {
    return new ProviderError({
      code: 'auth',
      providerId,
      message: message ?? `Provider ${providerId} rejected credentials`,
      status,
      retryable: false,
    });
  }
  if (status === 404) {
    return new ProviderError({
      code: 'not_found',
      providerId,
      message: message ?? `Provider ${providerId} resource not found`,
      status,
      retryable: false,
    });
  }
  if (status === 429) {
    return new ProviderError({
      code: 'rate_limited',
      providerId,
      message: message ?? `Provider ${providerId} rate limited`,
      status,
      retryable: true,
    });
  }
  if (status >= 500) {
    return new ProviderError({
      code: 'upstream',
      providerId,
      message: message ?? `Provider ${providerId} upstream error (${status})`,
      status,
      retryable: true,
    });
  }
  return new ProviderError({
    code: 'validation',
    providerId,
    message: message ?? `Provider ${providerId} returned status ${status}`,
    status,
    retryable: false,
  });
}
