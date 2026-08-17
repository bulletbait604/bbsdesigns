import type { NormalizedTrendSignal } from '@/services/trends/types'

function tokenize(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((t) => t.length > 2)
  )
}

/** Jaccard similarity on title tokens. */
export function titleSimilarity(a: string, b: string): number {
  const aa = tokenize(a)
  const bb = tokenize(b)
  if (aa.size === 0 || bb.size === 0) return 0
  let intersection = 0
  for (const t of aa) if (bb.has(t)) intersection++
  const union = aa.size + bb.size - intersection
  return union === 0 ? 0 : intersection / union
}

/**
 * Deduplicate similar trends within the same niche.
 * Keeps the first occurrence; merges source refs onto the keeper.
 */
export function dedupeTrends(
  signals: NormalizedTrendSignal[],
  threshold = 0.72
): NormalizedTrendSignal[] {
  const kept: NormalizedTrendSignal[] = []

  for (const signal of signals) {
    const duplicate = kept.find(
      (k) =>
        k.niche === signal.niche &&
        (k.externalId === signal.externalId ||
          titleSimilarity(k.title, signal.title) >= threshold)
    )

    if (!duplicate) {
      kept.push({ ...signal, sourceRefs: [...signal.sourceRefs] })
      continue
    }

    for (const ref of signal.sourceRefs) {
      if (!duplicate.sourceRefs.includes(ref)) duplicate.sourceRefs.push(ref)
    }
    for (const kw of signal.keywords) {
      if (!duplicate.keywords.includes(kw)) duplicate.keywords.push(kw)
    }
  }

  return kept
}
