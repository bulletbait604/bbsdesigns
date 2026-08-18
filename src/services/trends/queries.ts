import type { Niche } from '@/types'

/** Niche search phrases for marketplace / search demand research. */
export const TREND_SEARCH_QUERIES: Record<Niche, string[]> = {
  gaming: ['funny gaming tshirt', 'gamer humor shirt', 'lag joke merch'],
  baseball: ['funny baseball tshirt', 'beer league baseball shirt', 'baseball dad joke merch'],
  softball: ['funny softball tshirt', 'beer league softball shirt', 'softball humor merch'],
}

export function primaryTrendQuery(niche: Niche): string {
  return TREND_SEARCH_QUERIES[niche][0]
}
