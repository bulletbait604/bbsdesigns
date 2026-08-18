import { logger } from '@/lib/logger'
import type {
  ProviderConfigValidation,
  ProviderHealth,
  TrendFetchRequest,
  TrendProvider,
  TrendSignalDto,
} from '@/providers/types'

function health(provider: string, ok: boolean, message?: string): ProviderHealth {
  return {
    ok,
    provider,
    kind: 'trend',
    message,
    checkedAt: new Date().toISOString(),
  }
}

/**
 * Merges multiple trend sources. Skips sources that are not configured.
 * Failures in one source do not block others.
 */
export function createCompositeTrendProvider(
  sources: TrendProvider[],
  name = 'composite-trends'
): TrendProvider {
  return {
    kind: 'trend',
    name,
    validateConfig(): ProviderConfigValidation {
      const configured = sources.filter((s) => s.validateConfig().ok)
      if (configured.length === 0) {
        const missing = sources.flatMap((s) => s.validateConfig().missing)
        return {
          ok: false,
          missing: [...new Set(missing)],
          message: 'No trend sources configured',
        }
      }
      return { ok: true, missing: [] }
    },
    async healthCheck(): Promise<ProviderHealth> {
      const configured = sources.filter((s) => s.validateConfig().ok)
      if (!configured.length) return health(name, false, 'No trend sources configured')
      return health(
        name,
        true,
        `Sources ready: ${configured.map((s) => s.name).join(', ')}`
      )
    },
    async fetchSignals(request: TrendFetchRequest): Promise<TrendSignalDto[]> {
      const limit = request.limit ?? 8
      const perSource = Math.max(3, Math.ceil(limit / Math.max(1, sources.length)))
      const out: TrendSignalDto[] = []

      for (const source of sources) {
        const validation = source.validateConfig()
        if (!validation.ok) continue
        try {
          const batch = await source.fetchSignals({ ...request, limit: perSource })
          out.push(
            ...batch.map((dto) => ({
              ...dto,
              raw: { ...(dto.raw || {}), provider: source.name },
            }))
          )
        } catch (error) {
          logger.warn('trend_source_failed', {
            source: source.name,
            error: error instanceof Error ? error.message : String(error),
          })
        }
      }

      return out.slice(0, limit * 2)
    },
  }
}
