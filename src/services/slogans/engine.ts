import type { Niche } from '@/types'
import { reviewContentSafety, passesFirstSafetyGate } from '@/services/safety/engine'
import { generateSloganCandidates, SLOGAN_PROMPT_VERSION } from '@/services/slogans/generate'
import { scoreSlogan } from '@/services/slogans/score'
import type { SloganCandidate, SloganEngineResult } from '@/services/slogans/types'

/**
 * Slogan engine: generate → score → first safety gate.
 * Only candidates that are not REJECT are marked persistable.
 */
export async function runSloganEngine(input: {
  niche: Niche
  trendTitle?: string
  limit?: number
  runAiReview?: boolean
}): Promise<SloganEngineResult> {
  const raw = await generateSloganCandidates({
    niche: input.niche,
    trendTitle: input.trendTitle,
    limit: input.limit ?? 4,
  })

  const generated: SloganCandidate[] = []
  const accepted: SloganCandidate[] = []
  const rejected: SloganCandidate[] = []

  for (const item of raw) {
    const safety = await reviewContentSafety({
      text: `${item.slogan}\n${item.concept}`,
      niche: item.niche,
      runAiReview: input.runAiReview,
      persistLog: false,
      targetType: 'slogan',
    })

    const { scores, overall } = scoreSlogan({
      slogan: item.slogan,
      niche: item.niche,
      trendTitle: input.trendTitle,
      safetyScore: safety.score,
      ipRisk: safety.ipRisk,
    })

    const candidate: SloganCandidate = {
      niche: item.niche,
      slogan: item.slogan,
      concept: item.concept,
      promptVersion: item.promptVersion,
      scores: {
        ...scores,
        safety: safety.score,
        ipRisk: safety.ipRisk,
      },
      overall,
      sourceTrendTitle: input.trendTitle,
      safety,
      persisted: false,
    }

    generated.push(candidate)

    if (passesFirstSafetyGate(safety)) {
      candidate.persisted = true
      accepted.push(candidate)
    } else {
      rejected.push(candidate)
    }
  }

  return {
    generated,
    accepted,
    rejected,
    promptVersion: SLOGAN_PROMPT_VERSION,
  }
}

/** Explicit helper used by tests for franchise-tainted slogans. */
export async function reviewSloganText(text: string, niche: Niche = 'gaming') {
  return reviewContentSafety({ text, niche, runAiReview: false, persistLog: false })
}
