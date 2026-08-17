import { collapseObfuscation } from '@/services/safety/normalize'
import type { SafetyStageResult } from '@/services/safety/types'

/** Hard-reject / high-risk terms (non-exhaustive risk reduction, not legal clearance). */
export const HARD_BLOCK_TERMS = [
  'nazi',
  'kill yourself',
  'kys',
  'rape',
  'terrorist',
  'lynch',
  'slur',
] as const

export const EXPLICIT_SEXUAL_TERMS = [
  'porn',
  'xxx',
  'onlyfans',
  'nude',
  'blowjob',
  'handjob',
] as const

export const VIOLENCE_TERMS = ['behead', 'dismember', 'gore', 'school shooter'] as const

function containsTerm(haystack: string, term: string): boolean {
  if (term.includes(' ')) return haystack.includes(term)
  const parts = haystack.split(' ')
  return parts.some((p) => p === term || (term.length > 3 && p.includes(term)))
}

/** Stage 2 — blocked-term and light fuzzy matching. */
export function runBlockedTermStage(normalizedText: string): SafetyStageResult {
  const collapsed = collapseObfuscation(normalizedText)
  const triggered: string[] = []
  const notes: string[] = []
  let riskDelta = 0

  for (const term of HARD_BLOCK_TERMS) {
    if (containsTerm(collapsed, term)) {
      triggered.push(`hard_block:${term}`)
      riskDelta += 50
    }
  }
  for (const term of EXPLICIT_SEXUAL_TERMS) {
    if (containsTerm(collapsed, term)) {
      triggered.push(`explicit:${term}`)
      riskDelta += 45
    }
  }
  for (const term of VIOLENCE_TERMS) {
    if (containsTerm(collapsed, term)) {
      triggered.push(`violence:${term}`)
      riskDelta += 40
    }
  }

  if (triggered.length) {
    notes.push('Blocked-term stage found disallowed content patterns.')
  } else {
    notes.push('No blocked-term hits.')
  }

  return {
    stage: 'blocked_terms',
    triggered,
    notes,
    riskDelta: Math.min(100, riskDelta),
  }
}
