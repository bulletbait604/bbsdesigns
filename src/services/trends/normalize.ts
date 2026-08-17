import type { Niche } from '@/types'
import type { TrendSignalDto } from '@/providers/types'
import type { NormalizedTrendSignal } from '@/services/trends/types'

function clampText(value: string, max = 280): string {
  return value.trim().slice(0, max)
}

function slugId(niche: Niche, source: string, title: string, externalId?: string): string {
  if (externalId?.trim()) return externalId.trim()
  const base = `${source}:${niche}:${title}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 80)
  return base || `${source}-${niche}-unknown`
}

export function normalizeTrendDto(
  niche: Niche,
  source: string,
  dto: TrendSignalDto
): NormalizedTrendSignal {
  const title = clampText(dto.title || 'Untitled trend')
  const observedAt = dto.observedAt ? new Date(dto.observedAt) : new Date()
  const externalId = slugId(niche, source, title, dto.externalId)

  return {
    niche,
    source,
    externalId,
    title,
    summary: clampText(dto.summary || '', 600),
    keywords: (dto.keywords || []).map((k) => k.trim().toLowerCase()).filter(Boolean).slice(0, 20),
    observedAt: Number.isNaN(observedAt.getTime()) ? new Date() : observedAt,
    sourceRefs: [`${source}:${externalId}`],
    raw: dto.raw || {},
    hints: dto.scoreHint != null ? { virality: dto.scoreHint } : undefined,
  }
}

export function normalizeManualSignal(input: {
  niche: Niche
  title: string
  summary?: string
  keywords?: string[]
  source?: string
  externalId?: string
  observedAt?: Date
  hints?: NormalizedTrendSignal['hints']
  raw?: Record<string, unknown>
}): NormalizedTrendSignal {
  const source = input.source || 'manual'
  const title = clampText(input.title)
  const externalId = slugId(input.niche, source, title, input.externalId)

  return {
    niche: input.niche,
    source,
    externalId,
    title,
    summary: clampText(input.summary || '', 600),
    keywords: (input.keywords || []).map((k) => k.trim().toLowerCase()).filter(Boolean),
    observedAt: input.observedAt || new Date(),
    sourceRefs: [`${source}:${externalId}`],
    raw: input.raw || {},
    hints: input.hints,
  }
}
