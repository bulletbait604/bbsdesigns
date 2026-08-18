import type { CreativeBrief } from '@/services/designV2/types'
import {
  PRODUCT_INTELLIGENCE_V2_VERSION,
  type DesignDNA,
  type DesignDNAPerformance,
  type PerformanceSignals,
  type ProductIntelligenceSummary,
} from '@/services/productIntelligenceV2/types'

export function buildDesignDNA(brief: CreativeBrief, scores?: {
  visualImpact?: number
  commercialAppeal?: number
}): DesignDNA {
  return {
    niche: brief.niche,
    style: brief.styleId,
    typography: brief.typographyTreatment,
    colorCount: brief.colors.length,
    illustrationLevel: Math.round(brief.visualDominancePct / 10),
    humorLevel: /sarcasm|humor|rage|chaos|literally/i.test(brief.visualStory + brief.primaryText)
      ? 8
      : 5,
    visualImpact: scores?.visualImpact ?? Math.round(brief.visualDominancePct),
    commercialScore: scores?.commercialAppeal ?? 70,
    targetAudience: brief.targetAudience,
    productType: brief.product,
  }
}

export function scoreWinner(performance: PerformanceSignals): number {
  const purchases = performance.purchases ?? 0
  const revenue = performance.revenue ?? 0
  const conversion = performance.conversion ?? 0
  const atc = performance.addToCart ?? 0
  const clicks = performance.clicks ?? 0
  return Math.max(
    0,
    Math.min(
      100,
      Math.round(
        purchases * 12 +
          Math.min(40, revenue / 5) +
          conversion * 0.5 +
          Math.min(15, atc) +
          Math.min(10, clicks / 50)
      )
    )
  )
}

export function recordDesignDNAPerformance(input: {
  dna: DesignDNA
  performance: PerformanceSignals
  productId?: string
  designId?: string
}): DesignDNAPerformance {
  return {
    ...input.dna,
    productId: input.productId,
    designId: input.designId,
    performance: input.performance,
    winnerScore: scoreWinner(input.performance),
    updatedAt: new Date().toISOString(),
  }
}

/**
 * Controlled winner variations (Part 31) — related but original, never duplicates.
 */
export function proposeWinnerVariations(dna: DesignDNA): Array<{
  kind: string
  suggestion: string
}> {
  return [
    { kind: 'colorway', suggestion: `Alternate colorway for ${dna.style} / ${dna.niche}` },
    { kind: 'product', suggestion: `Extend to alternate product beyond ${dna.productType}` },
    { kind: 'slogan', suggestion: 'Related original slogan, not a clone' },
    { kind: 'character', suggestion: 'New original character in same humor lane' },
    { kind: 'composition', suggestion: 'Different composition / typography treatment' },
    { kind: 'audience', suggestion: `Adjacent audience to ${dna.targetAudience}` },
    { kind: 'style', suggestion: 'Sister style from the same niche recommendations' },
  ]
}

export function summarizeIntelligence(rows: DesignDNAPerformance[]): ProductIntelligenceSummary {
  const group = <K extends string>(keyFn: (r: DesignDNAPerformance) => K) => {
    const map = new Map<K, { sum: number; n: number }>()
    for (const r of rows) {
      const k = keyFn(r)
      const cur = map.get(k) || { sum: 0, n: 0 }
      cur.sum += r.winnerScore
      cur.n += 1
      map.set(k, cur)
    }
    return [...map.entries()]
      .map(([k, v]) => ({ key: k, avgWinner: Math.round(v.sum / v.n), n: v.n }))
      .sort((a, b) => b.avgWinner - a.avgWinner)
  }

  return {
    bestStyles: group((r) => String(r.style)).map((x) => ({
      style: x.key,
      avgWinner: x.avgWinner,
      n: x.n,
    })),
    bestNiches: group((r) => String(r.niche)).map((x) => ({
      niche: x.key,
      avgWinner: x.avgWinner,
      n: x.n,
    })),
    bestProductTypes: group((r) => r.productType).map((x) => ({
      productType: x.key,
      avgWinner: x.avgWinner,
      n: x.n,
    })),
    engineVersion: PRODUCT_INTELLIGENCE_V2_VERSION,
  }
}
