import type { Niche } from '@/lib/niches'

export type DesignPreviewId =
  | 'lag-lifestyle'
  | 'sunburnt-softball'
  | 'swing-bad-ideas'
  | 'cleats-dignity'
  | 'blocked-ip'

export type DemoIdea = {
  id: string
  niche: Niche
  slogan: string
  concept: string
  status: 'draft' | 'awaiting_approval' | 'approved' | 'rejected'
  safetyDecision: 'PASS' | 'REVIEW' | 'REJECT'
  /** Demo catalog preview id, or live Mongo Design _id */
  designId: DesignPreviewId | string | null
  trendScore: number
}

export type DemoDesign = {
  /** Demo catalog preview id, or live Mongo Design _id */
  id: DesignPreviewId | string
  ideaId: string
  niche: Niche
  title: string
  slogan: string
  style: string
  mockupLabel: string
  qualityScore: number
  ipRisk: number
  safetyDecision: 'PASS' | 'REVIEW' | 'REJECT'
  status: 'generated' | 'review' | 'approved' | 'rejected'
  /** Accent colors for generated SVG artwork */
  palette: {
    bg: string
    ink: string
    accent: string
    shirt: string
  }
}

/** Demo catalog emptied — dashboard never shows filler designs/ideas. */
export const DEMO_IDEAS: DemoIdea[] = []

export const DEMO_DESIGNS: DemoDesign[] = []

export function artworkUrl(id: DesignPreviewId): string {
  return `/api/design-preview?id=${id}&view=artwork`
}

export function mockupUrl(id: DesignPreviewId): string {
  return `/api/design-preview?id=${id}&view=mockup`
}

export function getDemoDesign(id: string): DemoDesign | undefined {
  return DEMO_DESIGNS.find((d) => d.id === id)
}
