import { tryGetProvider } from '@/providers/registry'
import { callProvider } from '@/providers/call'
import type { SafetyStageResult } from '@/services/safety/types'

export type AiTextReviewOutput = {
  stage: SafetyStageResult
  provider: string
  model: string
  modelResponse: string
}

/**
 * Stage 4 — AI text review via provider interface when available.
 * Falls back to heuristic review so local/offline still works.
 */
export async function runAiTextReviewStage(input: {
  text: string
  normalizedText: string
  priorTriggers: string[]
}): Promise<AiTextReviewOutput> {
  const provider = tryGetProvider('ai_text')
  const validation = provider?.validateConfig()

  if (provider && validation?.ok) {
    try {
      const completion = await callProvider(
        () =>
          provider.complete({
            system:
              'You are a merch safety reviewer. Reply with one line: DECISION=PASS|REVIEW|REJECT; REASONS=comma list. Never claim legal clearance.',
            prompt: `Review this merch slogan/text for IP, hate, threats, explicit sex, copied slogans, franchise marks:\n"""${input.text}"""`,
            temperature: 0,
            maxTokens: 120,
          }),
        {
          provider: provider.name,
          kind: 'ai_text',
          label: 'safety.ai_text_review',
          retries: 1,
          timeoutMs: 20_000,
        }
      )

      const response = completion.text
      const upper = response.toUpperCase()
      const triggered: string[] = []
      let riskDelta = 0

      if (upper.includes('DECISION=REJECT') || upper.includes('REJECT')) {
        triggered.push('ai:reject')
        riskDelta = 60
      } else if (upper.includes('DECISION=REVIEW') || upper.includes('REVIEW')) {
        triggered.push('ai:review')
        riskDelta = 25
      } else {
        triggered.push('ai:pass')
      }

      return {
        provider: completion.provider,
        model: completion.model,
        modelResponse: response,
        stage: {
          stage: 'ai_text_review',
          triggered,
          notes: ['AI text review completed via provider interface.'],
          riskDelta,
        },
      }
    } catch {
      // fall through to heuristic
    }
  }

  // Heuristic fallback (stub / no key)
  const triggered: string[] = []
  let riskDelta = 0
  if (input.priorTriggers.some((t) => t.startsWith('hard_block') || t.startsWith('explicit'))) {
    triggered.push('heuristic:escalate_reject')
    riskDelta = 40
  } else if (input.priorTriggers.some((t) => t.startsWith('ip:'))) {
    triggered.push('heuristic:escalate_review')
    riskDelta = 20
  } else {
    triggered.push('heuristic:pass')
  }

  return {
    provider: provider?.name ?? 'heuristic',
    model: 'heuristic-v1',
    modelResponse: `heuristic decision aids from prior triggers: ${input.priorTriggers.join('|') || 'none'}`,
    stage: {
      stage: 'ai_text_review',
      triggered,
      notes: ['AI provider unavailable or failed; used heuristic review.'],
      riskDelta,
    },
  }
}
