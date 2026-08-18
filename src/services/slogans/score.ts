import type { SloganScores } from '@/services/slogans/types'
import { isWeakSlogan } from '@/services/slogans/generate'

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

const NICHE_FLAVOR: Record<string, string[]> = {
  gaming: ['lag', 'queue', 'respawn', 'ping', 'tilt', 'controller', 'headset', 'pixel', 'npc', 'afk'],
  baseball: ['swing', 'pitch', 'dugout', 'inning', 'bat', 'glove', 'diamond', 'error', 'sunflower', 'strike'],
  softball: ['cleats', 'dugout', 'sunburn', 'catcher', 'innings', 'bench', 'pizza', 'standings', 'mitt', 'diamond'],
}

/**
 * Heuristic merch-copy scoring. Weak/cringe lines get crushed so the engine can drop them.
 */
export function scoreSlogan(input: {
  slogan: string
  niche: string
  trendTitle?: string
  safetyScore?: number
  ipRisk?: number
}): { scores: SloganScores; overall: number } {
  const text = input.slogan.toLowerCase()
  const words = text.split(/\s+/).filter(Boolean)
  const weak = isWeakSlogan(input.slogan)

  let humor = 58 + Math.min(20, words.length * 2)
  if (/[.!?]/.test(input.slogan)) humor += 6
  if (/\b(bad|still|optional|suffer|emotionally|lost count|gossip)\b/i.test(input.slogan)) humor += 8
  if (weak) humor -= 35

  let originality = 72
  if (/\bofficial\b/.test(text)) originality -= 40
  if (weak) originality -= 30
  if (words.length <= 6 && words.length >= 3) originality += 8

  let shareability = 52 + (words.length <= 7 ? 22 : 4)
  if (input.slogan.includes('.') || input.slogan.includes('?')) shareability += 6
  if (weak) shareability -= 25

  let printability = words.length <= 8 && input.slogan.length <= 48 ? 92 : 58
  if (input.slogan.length > 56) printability -= 25
  if (weak) printability -= 15

  const flavor = NICHE_FLAVOR[input.niche] || []
  const flavorHits = flavor.filter((w) => text.includes(w)).length
  let trendFit = input.trendTitle
    ? 48 +
      input.trendTitle
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 3 && text.includes(w)).length *
        10
    : 60
  trendFit += Math.min(18, flavorHits * 6)
  if (weak) trendFit -= 20

  const safety = clamp(input.safetyScore ?? 90)
  const ipRisk = clamp(input.ipRisk ?? 5)

  const scores: SloganScores = {
    humor: clamp(humor),
    originality: clamp(originality),
    shareability: clamp(shareability),
    printability: clamp(printability),
    trendFit: clamp(trendFit),
    safety,
    ipRisk,
  }

  let overall = clamp(
    scores.humor * 0.25 +
      scores.originality * 0.2 +
      scores.shareability * 0.15 +
      scores.printability * 0.15 +
      scores.trendFit * 0.15 +
      scores.safety * 0.05 +
      (100 - scores.ipRisk) * 0.05
  )

  if (weak) overall = Math.min(overall, 45)

  return { scores, overall }
}

/** Minimum overall score to persist / design from an AI slogan. */
export const MIN_SLOGAN_OVERALL = 68
