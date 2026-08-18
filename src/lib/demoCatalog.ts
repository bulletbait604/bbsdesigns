export type DesignPreviewId =
  | 'lag-lifestyle'
  | 'sunburnt-softball'
  | 'swing-bad-ideas'
  | 'cleats-dignity'
  | 'blocked-ip'

export type DemoIdea = {
  id: string
  niche: 'gaming' | 'baseball' | 'softball'
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
  niche: 'gaming' | 'baseball' | 'softball'
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

export const DEMO_IDEAS: DemoIdea[] = [
  {
    id: 'idea-001',
    niche: 'gaming',
    slogan: 'Lag Is A Lifestyle',
    concept: 'Self-roast for high-ping loyalty',
    status: 'awaiting_approval',
    safetyDecision: 'PASS',
    designId: 'lag-lifestyle',
    trendScore: 76,
  },
  {
    id: 'idea-002',
    niche: 'softball',
    slogan: 'Sunburnt. Competitive. Still Here.',
    concept: 'Beer-league softball identity line',
    status: 'approved',
    safetyDecision: 'PASS',
    designId: 'sunburnt-softball',
    trendScore: 89,
  },
  {
    id: 'idea-003',
    niche: 'baseball',
    slogan: 'I Only Swing At Bad Ideas',
    concept: 'Beer-league confession about aggressive choices',
    status: 'awaiting_approval',
    safetyDecision: 'PASS',
    designId: 'swing-bad-ideas',
    trendScore: 82,
  },
  {
    id: 'idea-004',
    niche: 'softball',
    slogan: 'Cleats On. Dignity Optional.',
    concept: 'Mildly risqué recreational athlete joke',
    status: 'draft',
    safetyDecision: 'PASS',
    designId: 'cleats-dignity',
    trendScore: 74,
  },
  {
    id: 'idea-005',
    niche: 'gaming',
    slogan: 'Official Championship Circuit',
    concept: 'Blocked franchise-like concept',
    status: 'rejected',
    safetyDecision: 'REJECT',
    designId: null,
    trendScore: 92,
  },
]

export const DEMO_DESIGNS: DemoDesign[] = [
  {
    id: 'lag-lifestyle',
    ideaId: 'idea-001',
    niche: 'gaming',
    title: 'Lag Is A Lifestyle Tee',
    slogan: 'Lag Is A Lifestyle',
    style: 'Pixel-noise wordmark',
    mockupLabel: 'Navy tee · front print',
    qualityScore: 86,
    ipRisk: 5,
    safetyDecision: 'PASS',
    status: 'review',
    palette: { bg: '#07111f', ink: '#eef5ff', accent: '#c8f542', shirt: '#1e3a5f' },
  },
  {
    id: 'sunburnt-softball',
    ideaId: 'idea-002',
    niche: 'softball',
    title: 'Sunburnt Competitive Still Here Tee',
    slogan: 'Sunburnt. Competitive. Still Here.',
    style: 'Type-led dugout mark',
    mockupLabel: 'Black tee · front print',
    qualityScore: 88,
    ipRisk: 2,
    safetyDecision: 'PASS',
    status: 'approved',
    palette: { bg: '#1a0f0a', ink: '#fff4e8', accent: '#f0a35a', shirt: '#141414' },
  },
  {
    id: 'swing-bad-ideas',
    ideaId: 'idea-003',
    niche: 'baseball',
    title: 'I Only Swing At Bad Ideas Tee',
    slogan: 'I Only Swing At Bad Ideas',
    style: 'Bold stacked type',
    mockupLabel: 'Heather grey tee · chest print',
    qualityScore: 84,
    ipRisk: 4,
    safetyDecision: 'PASS',
    status: 'review',
    palette: { bg: '#0c1a2e', ink: '#eef5ff', accent: '#5eead4', shirt: '#9aa3ad' },
  },
  {
    id: 'cleats-dignity',
    ideaId: 'idea-004',
    niche: 'softball',
    title: 'Cleats On Dignity Optional Tee',
    slogan: 'Cleats On. Dignity Optional.',
    style: 'Cheeky two-line lockup',
    mockupLabel: 'Forest tee · front print',
    qualityScore: 87,
    ipRisk: 3,
    safetyDecision: 'PASS',
    status: 'generated',
    palette: { bg: '#0a1f14', ink: '#e8fff0', accent: '#7dffa4', shirt: '#1f3d2c' },
  },
]

export function artworkUrl(id: DesignPreviewId): string {
  return `/api/design-preview?id=${id}&view=artwork`
}

export function mockupUrl(id: DesignPreviewId): string {
  return `/api/design-preview?id=${id}&view=mockup`
}

export function getDemoDesign(id: string): DemoDesign | undefined {
  return DEMO_DESIGNS.find((d) => d.id === id)
}
