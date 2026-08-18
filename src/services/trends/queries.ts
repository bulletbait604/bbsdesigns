import type { Niche } from '@/types'
import { primaryViralQuery, viralSearchQueries } from '@/services/trends/viralAlgorithm'

/** Niche search phrases for marketplace / search demand research (Viral Flash algorithm). */
export const TREND_SEARCH_QUERIES: Record<Niche, string[]> = {
  gaming: viralSearchQueries('gaming'),
  baseball: viralSearchQueries('baseball'),
  softball: viralSearchQueries('softball'),
}

export function primaryTrendQuery(niche: Niche): string {
  return primaryViralQuery(niche)
}
