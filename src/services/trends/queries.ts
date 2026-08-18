import type { Niche } from '@/types'
import { NICHES } from '@/lib/niches'
import { primaryViralQuery, viralSearchQueries } from '@/services/trends/viralAlgorithm'

/** Niche search phrases for marketplace / social-discovery research (Viral Flash v2). */
export const TREND_SEARCH_QUERIES: Record<Niche, string[]> = Object.fromEntries(
  NICHES.map((niche) => [niche, viralSearchQueries(niche)])
) as Record<Niche, string[]>

export function primaryTrendQuery(niche: Niche): string {
  return primaryViralQuery(niche)
}
