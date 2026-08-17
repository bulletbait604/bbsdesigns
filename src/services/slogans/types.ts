import type { Niche } from '@/types'
import type { SafetyReviewResult } from '@/services/safety/types'

export type SloganScores = {
  humor: number
  originality: number
  shareability: number
  printability: number
  trendFit: number
  safety: number
  ipRisk: number
}

export type SloganCandidate = {
  niche: Niche
  slogan: string
  concept: string
  promptVersion: string
  scores: SloganScores
  overall: number
  sourceTrendTitle?: string
  safety?: SafetyReviewResult
  persisted: boolean
}

export type SloganEngineResult = {
  generated: SloganCandidate[]
  accepted: SloganCandidate[]
  rejected: SloganCandidate[]
  promptVersion: string
}
