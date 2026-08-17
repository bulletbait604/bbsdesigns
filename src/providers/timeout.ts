import { ProviderError } from '@/providers/errors'

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  opts: { provider: string; kind: string; label?: string }
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(
            new ProviderError(`${opts.label ?? 'provider call'} timed out after ${timeoutMs}ms`, {
              provider: opts.provider,
              kind: opts.kind,
              code: 'PROVIDER_TIMEOUT',
              statusCode: 504,
              retryable: true,
            })
          )
        }, timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}
