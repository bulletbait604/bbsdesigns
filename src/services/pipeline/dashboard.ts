import { isMongoConfigured, connectMongo } from '@/lib/db'
import { Idea } from '@/models/Idea'
import { Design } from '@/models/Design'
import { DEMO_IDEAS, DEMO_DESIGNS, type DemoIdea, type DemoDesign } from '@/lib/demoCatalog'
import { DEMO_APPROVALS, type QueueItem } from '@/lib/dashboardData'
import type { Niche, SafetyDecision } from '@/types'

function previewArtwork(slogan: string, niche: Niche, assetUrl?: string): string {
  if (assetUrl?.startsWith('/api/')) return assetUrl
  const q = new URLSearchParams({ slogan, niche, view: 'artwork' })
  return `/api/design-preview?${q.toString()}`
}

function previewMockup(slogan: string, niche: Niche, mockupKeys?: string[]): string {
  if (mockupKeys?.[0]?.startsWith('/api/')) return mockupKeys[0]
  const q = new URLSearchParams({ slogan, niche, view: 'mockup' })
  return `/api/design-preview?${q.toString()}`
}

export type LiveIdeaCard = DemoIdea & {
  artworkUrl?: string | null
  source: 'mongo' | 'demo'
}

export async function loadIdeasForDashboard(): Promise<{
  ideas: LiveIdeaCard[]
  source: 'mongo' | 'demo'
}> {
  if (!isMongoConfigured()) {
    return {
      ideas: DEMO_IDEAS.map((i) => ({ ...i, source: 'demo' as const })),
      source: 'demo',
    }
  }

  await connectMongo()
  const docs = await Idea.find({}).sort({ createdAt: -1 }).limit(40).lean()
  if (!docs.length) {
    return {
      ideas: DEMO_IDEAS.map((i) => ({ ...i, source: 'demo' as const })),
      source: 'demo',
    }
  }

  const designs = await Design.find({
    ideaId: { $in: docs.map((d) => String(d._id)) },
  }).lean()
  const byIdea = new Map(designs.map((d) => [String(d.ideaId), d]))

  const ideas: LiveIdeaCard[] = docs.map((doc) => {
    const design = byIdea.get(String(doc._id))
    const niche = doc.niche as Niche
    const decision = (doc.provenance?.safetyDecision || 'REVIEW') as SafetyDecision
    return {
      id: String(doc._id),
      niche,
      slogan: doc.slogan,
      concept: doc.concept || '',
      status: (doc.status as DemoIdea['status']) || 'draft',
      safetyDecision: decision,
      designId: design ? 'lag-lifestyle' : null,
      trendScore: Math.round(doc.provenance?.qualityScore ?? 70),
      artworkUrl: design
        ? previewArtwork(doc.slogan, niche, design.assetUrl)
        : decision === 'REJECT'
          ? null
          : previewArtwork(doc.slogan, niche),
      source: 'mongo',
    }
  })

  return { ideas, source: 'mongo' }
}

export async function loadSafetyQueueForDashboard(): Promise<{
  items: QueueItem[]
  source: 'mongo' | 'demo'
}> {
  if (!isMongoConfigured()) {
    return { items: DEMO_APPROVALS, source: 'demo' }
  }

  await connectMongo()
  const ideas = await Idea.find({
    status: { $in: ['awaiting_approval', 'approved', 'draft', 'rejected'] },
  })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean()

  if (!ideas.length) {
    return { items: DEMO_APPROVALS, source: 'demo' }
  }

  const designs = await Design.find({
    ideaId: { $in: ideas.map((i) => String(i._id)) },
  }).lean()
  const byIdea = new Map(designs.map((d) => [String(d.ideaId), d]))

  const items: QueueItem[] = ideas.map((idea) => {
    const design = byIdea.get(String(idea._id))
    const niche = idea.niche as Niche
    const safetyDecision = (idea.provenance?.safetyDecision || 'REVIEW') as SafetyDecision
    const slogan = idea.slogan
    return {
      id: String(idea._id),
      niche,
      trend: (idea.provenance?.sourceTrendIds?.[0] as string) || 'Pipeline trend',
      slogan,
      title: `${slogan.replace(/\.$/, '')} Tee`.slice(0, 80),
      description:
        idea.concept ||
        `Original ${niche} humor merch. Safety ${safetyDecision}. Human approval required.`,
      tags: [niche, 'humor', 'original', 'pod'],
      trendScore: Math.round(idea.provenance?.qualityScore ?? 70),
      safetyScore: Math.round(idea.provenance?.safetyScore ?? 0),
      safetyDecision,
      ipRisk: safetyDecision === 'REJECT' ? 80 : safetyDecision === 'REVIEW' ? 25 : 5,
      qualityScore: Math.round(design?.qualityScore ?? 70),
      estimatedMargin: 72,
      designLabel: design?.provider || 'pending',
      mockupLabel: design?.mockupKeys?.length ? 'Tee mockup ready' : 'Mockup pending',
      status: idea.status,
      artworkUrl: design
        ? previewArtwork(slogan, niche, design.assetUrl)
        : safetyDecision === 'REJECT'
          ? undefined
          : previewArtwork(slogan, niche),
      mockupUrl: design
        ? previewMockup(slogan, niche, design.mockupKeys)
        : safetyDecision === 'REJECT'
          ? undefined
          : previewMockup(slogan, niche),
    }
  })

  return { items, source: 'mongo' }
}

export type LiveDesignCard = DemoDesign & {
  source: 'mongo' | 'demo'
  artworkSrc?: string
  mockupSrc?: string
  mongoId?: string
}

export async function loadDesignsForDashboard(): Promise<{
  designs: LiveDesignCard[]
  source: 'mongo' | 'demo'
}> {
  if (!isMongoConfigured()) {
    return {
      designs: DEMO_DESIGNS.map((d) => ({ ...d, source: 'demo' as const })),
      source: 'demo',
    }
  }

  await connectMongo()
  const docs = await Design.find({ status: { $ne: 'rejected' } })
    .sort({ createdAt: -1 })
    .limit(40)
    .lean()

  if (!docs.length) {
    return {
      designs: DEMO_DESIGNS.map((d) => ({ ...d, source: 'demo' as const })),
      source: 'demo',
    }
  }

  const designs: LiveDesignCard[] = docs.map((doc) => {
    const niche = doc.niche as Niche
    const slogan = doc.slogan || doc.title
    const decision = (doc.imageReviewDecision ||
      doc.provenance?.safetyDecision ||
      'REVIEW') as SafetyDecision
    return {
      id: 'lag-lifestyle',
      ideaId: String(doc.ideaId),
      niche,
      title: doc.title || slogan,
      slogan,
      style: `${doc.provider} · ${doc.model}`,
      mockupLabel: doc.mockupKeys?.length ? 'Tee mockup ready' : 'Mockup preview',
      qualityScore: Math.round(doc.qualityScore ?? 70),
      ipRisk: Math.round(doc.ipRisk ?? 5),
      safetyDecision: decision,
      status: (doc.status as DemoDesign['status']) || 'review',
      palette: {
        bg: '#0b1220',
        ink: '#f4f7fb',
        accent: niche === 'gaming' ? '#5eead4' : niche === 'baseball' ? '#86efac' : '#f0abfc',
        shirt: '#1e293b',
      },
      source: 'mongo',
      mongoId: String(doc._id),
      artworkSrc:
        doc.assetUrl?.startsWith('http') || doc.assetUrl?.startsWith('/api/')
          ? doc.assetUrl
          : previewArtwork(slogan, niche, doc.assetUrl),
      mockupSrc: previewMockup(slogan, niche, doc.mockupKeys),
    }
  })

  return { designs, source: 'mongo' }
}
