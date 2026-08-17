import { AppError } from '@/lib/errors'

export class ProviderError extends AppError {
  readonly provider: string
  readonly kind: string
  readonly retryable: boolean

  constructor(
    message: string,
    opts: {
      provider: string
      kind: string
      code?: string
      statusCode?: number
      retryable?: boolean
      details?: unknown
    }
  ) {
    super(message, {
      statusCode: opts.statusCode ?? 502,
      code: opts.code ?? 'PROVIDER_ERROR',
      details: opts.details,
    })
    this.name = 'ProviderError'
    this.provider = opts.provider
    this.kind = opts.kind
    this.retryable = opts.retryable ?? false
  }
}

export function isProviderError(error: unknown): error is ProviderError {
  return error instanceof ProviderError
}
