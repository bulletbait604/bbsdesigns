import { collapseObfuscation } from '@/services/safety/normalize'
import type { SafetyStageResult } from '@/services/safety/types'

/** Franchise / game / sports / celebrity risk markers. */
export const IP_RISK_TERMS = [
  'nintendo',
  'pokemon',
  'mario',
  'luigi',
  'zelda',
  'link',
  'pikachu',
  'fortnite',
  'minecraft',
  'roblox',
  'call of duty',
  'warzone',
  'league of legends',
  'valorant',
  'overwatch',
  'disney',
  'marvel',
  'spiderman',
  'batman',
  'star wars',
  'harry potter',
  'nba',
  'nfl',
  'nhl',
  'mlb',
  'yankees',
  'dodgers',
  'lakers',
  'patriots',
  'cowboys',
  'red sox',
  'cubs',
  'world series champions official',
  'nike swoosh',
  'adidas',
  'jordan brand',
] as const

function hit(haystack: string, term: string): boolean {
  if (term.includes(' ')) return haystack.includes(term)
  const re = new RegExp(`(?:^|\\s)${term}(?:\\s|$)`)
  return re.test(haystack)
}

/** Stage 3 — IP / trademark / franchise risk classification. */
export function runIpRiskStage(normalizedText: string): SafetyStageResult {
  const collapsed = collapseObfuscation(normalizedText)
  const triggered: string[] = []
  const notes: string[] = []
  let riskDelta = 0

  for (const term of IP_RISK_TERMS) {
    if (hit(collapsed, term)) {
      triggered.push(`ip:${term}`)
      riskDelta += term.length > 8 ? 35 : 28
    }
  }

  // Copied-slogan style phrases often include "official" + brand-like nouns
  if (/\bofficial\b/.test(collapsed) && /\b(championship|licensed|authentic)\b/.test(collapsed)) {
    triggered.push('ip:official_licensed_pattern')
    riskDelta += 20
  }

  if (triggered.length) {
    notes.push('IP risk markers detected — treat as reject or review.')
  } else {
    notes.push('No obvious franchise/team/brand markers.')
  }

  return {
    stage: 'ip_risk',
    triggered,
    notes,
    riskDelta: Math.min(100, riskDelta),
  }
}
