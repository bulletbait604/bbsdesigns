import { getEnv } from '@/lib/env'
import { createCompositeTrendProvider } from '@/providers/trend/composite'
import { createEtsyTrendProvider } from '@/providers/trend/etsy'
import { createSerpApiTrendProvider } from '@/providers/trend/serpapi'
import { createStubTrendProvider } from '@/providers/stubs'
import type { TrendProvider } from '@/providers/types'

/** Prefer live SerpAPI + Etsy when configured; otherwise stub. */
export function createConfiguredTrendProvider(): TrendProvider {
  const env = getEnv()
  const sources: TrendProvider[] = []

  if (env.SERPAPI_API_KEY) sources.push(createSerpApiTrendProvider())
  if (env.ETSY_API_KEY) sources.push(createEtsyTrendProvider())

  if (sources.length === 0) return createStubTrendProvider()
  if (sources.length === 1) return sources[0]
  return createCompositeTrendProvider(sources)
}
