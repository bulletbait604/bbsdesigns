import type { SloganScores } from '@/services/slogans/types'

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

export function scoreSlogan(input: {
  slogan: string
  niche: string
  trendTitle?: string
  safetyScore?: number
  ipRisk?: number
}): { scores: SloganScores; overall: number } {
  const text = input.slogan.toLowerCase()
  const words = text.split(/\s+/).filter(Boolean)
  const humor = clamp(60 + Math.min(25, words.length * 2) + (text.includes('bad') ? 5 : 0))
  const originality = clamp(70 + (text.includes('official') ? -40 : 10))
  const shareability = clamp(55 + (words.length <= 6 ? 20 : 5))
  const printability = clamp(words.length <= 8 && input.slogan.length <= 48 ? 90 : 55)
  const trendFit = clamp(
    input.trendTitle
      ? 50 +
          input.trendTitle
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length > 3 && text.includes(w)).length *
            12
      : 65
  )
  const safety = clamp(input.safetyScore ?? 90)
  const ipRisk = clamp(input.ipRisk ?? 5)

  const scores: SloganScores = {
    humor,
    originality,
    shareability,
    printability,
    trendFit,
    safety,
    ipRisk,
  }

  const overall = clamp(
    humor * 0.2 +
      originality * 0.2 +
      shareability * 0.15 +
      printability * 0.15 +
      trendFit * 0.15 +
      safety * 0.1 +
      (100 - ipRisk) * 0.05
  )

  return { scores, overall }
}
