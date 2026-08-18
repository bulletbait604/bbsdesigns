import { isMongoConfigured, connectMongo } from '@/lib/db'
import { Idea } from '@/models/Idea'
import { Design } from '@/models/Design'
import { Product } from '@/models/Product'
import { DEMO_IDEAS, DEMO_DESIGNS, type DemoIdea, type DemoDesign } from '@/lib/demoCatalog'
import { DEMO_APPROVALS, DEMO_STATS, DEMO_TRENDS, type PipelineStat, type QueueItem } from '@/lib/dashboardData'
import type { Niche, SafetyDecision } from '@/types'

function isBrowserSafeAssetUrl(url?: string | null): boolean {
  if (!url) return false
  if (url.startsWith('/api/design-assets/') || url.startsWith('/api/design-preview')) return true
  if (url.startsWith('local://')) return false
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false
  try {
    const host = new URL(url).hostname.toLowerCase()
    if (host === 'example.invalid' || host.endsWith('.invalid') || host === 'localhost') return false
    return true
  } catch {
    return false
  }
}

function previewArtwork(slogan: string, niche: Niche, assetUrl?: string | null): string {
  if (isBrowserSafeAssetUrl(assetUrl)) return assetUrl as string
  const q = new URLSearchParams({ slogan, niche, view: 'artwork' })
  return `/api/design-preview?${q.toString()}`
}

function previewMockup(slogan: string, niche: Niche, mockupKeys?: string[] | null): string {
  const first = mockupKeys?.[0]
  if (isBrowserSafeAssetUrl(first)) return first as string
  const q = new URLSearchParams({ slogan, niche, view: 'mockup' })
  return `/api/design-preview?${q.toString()}`
}

function estimateMargin(qualityScore: number): number {
  return Math.min(92, Math.max(35, Math.round(qualityScore * 0.85)))
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
    return { ideas: [], source: 'mongo' }
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
      designId: design ? String(design._id) : null,
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
    return { items: [], source: 'mongo' }
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
    const qualityScore = Math.round(design?.qualityScore ?? idea.provenance?.qualityScore ?? 70)
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
      qualityScore,
      estimatedMargin: estimateMargin(qualityScore),
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

export type LiveDesignCard = Omit<DemoDesign, 'id'> & {
  id: string
  source: 'mongo' | 'demo'
  artworkSrc?: string
  mockupSrc?: string
  mongoId?: string
  /** True when artwork is local SVG placeholder, not Google AI raster art */
  isPlaceholder?: boolean
  ideaIdMongo?: string
  /** Visual/joke brief from the source Idea (feeds better image prompts) */
  concept?: string
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
    return { designs: [], source: 'mongo' }
  }

  const ideaIds = [...new Set(docs.map((d) => String(d.ideaId)).filter(Boolean))]
  const ideas = ideaIds.length
    ? await Idea.find().where('_id').in(ideaIds).select({ concept: 1 }).lean()
    : []
  const conceptByIdea = new Map(ideas.map((i) => [String(i._id), i.concept || '']))

  const { cachedDesignIdsWithBytes } = await import('@/services/designs/cache')
  const { DESIGN_PROMPT_VERSION } = await import('@/services/designs/types')
  const assetIds = docs
    .map((d) => d.assetKey)
    .filter((k): k is string => Boolean(k) && !String(k).startsWith('svg:'))
  const cachedIds = await cachedDesignIdsWithBytes(assetIds)

  const designs: LiveDesignCard[] = docs.map((doc) => {
    const niche = doc.niche as Niche
    const slogan = doc.slogan || doc.title
    const decision = (doc.imageReviewDecision ||
      doc.provenance?.safetyDecision ||
      'REVIEW') as SafetyDecision
    const mongoId = String(doc._id)
    const assetKey = doc.assetKey || ''
    const assetUrl = doc.assetUrl || ''
    const missingRaster =
      assetUrl.includes('/api/design-assets/') && assetKey && !cachedIds.has(assetKey)
    const stalePrompt =
      Boolean(doc.promptVersion) && doc.promptVersion !== DESIGN_PROMPT_VERSION
    const isPlaceholder =
      (doc.provider || '').includes('svg') ||
      (doc.provider || '').includes('stub') ||
      (doc.model || '').includes('lite') ||
      (doc.model || '').includes('stub') ||
      doc.mimeType === 'image/svg+xml' ||
      assetUrl.includes('design-preview') ||
      assetUrl.startsWith('local://') ||
      assetUrl.includes('example.invalid') ||
      missingRaster ||
      stalePrompt ||
      !assetUrl
    return {
      id: mongoId,
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
      mongoId,
      ideaIdMongo: String(doc.ideaId),
      isPlaceholder,
      concept: conceptByIdea.get(String(doc.ideaId)) || '',
      artworkSrc: isPlaceholder
        ? previewArtwork(slogan, niche)
        : previewArtwork(slogan, niche, doc.assetUrl),
      mockupSrc: previewMockup(slogan, niche, doc.mockupKeys),
    }
  })

  return { designs, source: 'mongo' }
}

export type OverviewTrend = {
  niche: string
  title: string
  score: number
  status: string
  source?: string
}

export async function loadOverviewForDashboard(): Promise<{
  stats: PipelineStat[]
  approvals: QueueItem[]
  trends: OverviewTrend[]
  source: 'mongo' | 'demo'
  empty: boolean
}> {
  if (!isMongoConfigured()) {
    return {
      stats: DEMO_STATS,
      approvals: DEMO_APPROVALS,
      trends: DEMO_TRENDS,
      source: 'demo',
      empty: true,
    }
  }

  await connectMongo()

  const [awaitingApproval, shopifyDrafts, safetyRejects, safetyQueue, ideaCount, productCount] =
    await Promise.all([
      Idea.countDocuments({ status: 'awaiting_approval' }),
      Product.countDocuments({
        $or: [{ status: 'shopify_draft' }, { shopifyProductId: { $ne: null } }],
      }),
      Idea.countDocuments({
        $or: [{ status: 'rejected' }, { 'provenance.safetyDecision': 'REJECT' }],
      }),
      loadSafetyQueueForDashboard(),
      Idea.countDocuments({}),
      Product.countDocuments({}),
    ])

  const empty = ideaCount === 0 && productCount === 0

  let trends: OverviewTrend[] = []
  let trendAvg = 0
  try {
    const { runTrendEngine } = await import('@/services/trends/engine')
    const { bootstrapProviders } = await import('@/providers/bootstrap')
    bootstrapProviders()
    const scored = await runTrendEngine({
      includeCurated: true,
      includeRegisteredTrendProvider: true,
      limitPerNiche: 4,
    })
    if (scored.length) {
      trends = scored
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
        .map((t) => ({
          niche: t.signal.niche,
          title: t.signal.title,
          score: t.score,
          status: t.ipRisk >= 40 ? 'ip_review' : 'scored',
          source: String(t.signal.raw?.source || t.signal.source),
        }))
      trendAvg = Math.round(scored.reduce((sum, t) => sum + t.score, 0) / scored.length)
    }
  } catch {
    trends = []
    trendAvg = 0
  }

  const stats: PipelineStat[] = [
    {
      label: 'Awaiting approval',
      value: String(awaitingApproval),
      hint: empty ? 'Run automation or seed ideas' : 'Human gate is on',
    },
    {
      label: 'Shopify drafts',
      value: String(shopifyDrafts),
      hint: shopifyDrafts ? 'Draft-only until AUTO_PUBLISH' : 'Approve + create draft from Safety',
    },
    {
      label: 'Safety rejects',
      value: String(safetyRejects),
      hint: 'REJECT always wins',
    },
    {
      label: 'Trend score avg',
      value: trendAvg ? String(trendAvg) : '—',
      hint: 'Not a sales guarantee',
    },
  ]

  const approvals = safetyQueue.items
    .filter((i) => i.status === 'awaiting_approval' || i.safetyDecision === 'REVIEW')
    .slice(0, 5)

  return {
    stats,
    approvals: approvals.length ? approvals : safetyQueue.items.slice(0, 5),
    trends,
    source: 'mongo',
    empty,
  }
}
