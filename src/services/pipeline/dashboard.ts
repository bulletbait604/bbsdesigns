import { isMongoConfigured, connectMongo } from '@/lib/db'
import { Idea } from '@/models/Idea'
import { Design } from '@/models/Design'
import { Product } from '@/models/Product'
import type { DemoIdea, DemoDesign } from '@/lib/demoCatalog'
import { type PipelineStat, type QueueItem } from '@/lib/dashboardData'
import type { Niche, SafetyDecision } from '@/types'

function isBrowserSafeAssetUrl(url?: string | null): boolean {
  if (!url) return false
  if (url.includes('design-preview') || url.startsWith('local://')) return false
  if (url.startsWith('/api/design-assets/')) return true
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false
  try {
    const host = new URL(url).hostname.toLowerCase()
    if (host === 'example.invalid' || host.endsWith('.invalid') || host === 'localhost') return false
    return true
  } catch {
    return false
  }
}

function previewArtwork(_slogan: string, _niche: Niche, assetUrl?: string | null): string | null {
  if (isBrowserSafeAssetUrl(assetUrl)) return assetUrl as string
  return null
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
    return { ideas: [], source: 'demo' }
  }

  await connectMongo()
  try {
    const { ensureViralAlgorithmMigration } = await import('@/services/trends/purge')
    await ensureViralAlgorithmMigration()
  } catch {
    // purge migration is best-effort
  }

  const docs = await Idea.find({}).sort({ createdAt: -1 }).limit(40).lean()
  if (!docs.length) {
    return { ideas: [], source: 'mongo' }
  }

  const ideaIds = docs.map((d) => d._id)
  const designs = await Design.find().where('ideaId').in(ideaIds).lean()
  const byIdea = new Map(designs.map((d) => [String(d.ideaId), d]))

  const ideas: LiveIdeaCard[] = docs.map((doc) => {
    const design = byIdea.get(String(doc._id))
    const niche = doc.niche as Niche
    const decision = (doc.provenance?.safetyDecision || 'REVIEW') as SafetyDecision
    const assetUrl = design?.assetUrl || ''
    const isSvgArt =
      !design ||
      (design.provider || '').includes('svg') ||
      design.mimeType === 'image/svg+xml' ||
      assetUrl.includes('design-preview') ||
      assetUrl.startsWith('local://')
    return {
      id: String(doc._id),
      niche,
      slogan: doc.slogan,
      concept: doc.concept || '',
      status: (doc.status as DemoIdea['status']) || 'draft',
      safetyDecision: decision,
      designId: design ? String(design._id) : null,
      trendScore: Math.round(doc.provenance?.qualityScore ?? 70),
      artworkUrl:
        decision === 'REJECT' || isSvgArt
          ? null
          : previewArtwork(doc.slogan, niche, design?.assetUrl),
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
    return { items: [], source: 'demo' }
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

  const designs = await Design.find().where('ideaId').in(ideas.map((i) => i._id)).lean()
  const byIdea = new Map(designs.map((d) => [String(d.ideaId), d]))

  const items: QueueItem[] = ideas.map((idea) => {
    const design = byIdea.get(String(idea._id))
    const niche = idea.niche as Niche
    const safetyDecision = (idea.provenance?.safetyDecision || 'REVIEW') as SafetyDecision
    const slogan = idea.slogan
    const qualityScore = Math.round(design?.qualityScore ?? idea.provenance?.qualityScore ?? 70)
    const assetUrl = design?.assetUrl || ''
    const isSvgArt =
      !design ||
      (design.provider || '').includes('svg') ||
      design.mimeType === 'image/svg+xml' ||
      assetUrl.includes('design-preview') ||
      assetUrl.startsWith('local://')
    const realArt =
      !isSvgArt && design
        ? previewArtwork(slogan, niche, design.assetUrl) || undefined
        : undefined
    const realMock =
      design && !isSvgArt
        ? (design.mockupKeys || []).find(
            (u) => isBrowserSafeAssetUrl(u) && !u.includes('design-preview')
          ) ||
          realArt ||
          undefined
        : undefined
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
      designLabel: isSvgArt ? 'awaiting_gemini' : design?.provider || 'pending',
      mockupLabel: realMock ? 'AI print preview' : 'Awaiting Gemini art',
      status: idea.status,
      artworkUrl: safetyDecision === 'REJECT' ? undefined : realArt,
      mockupUrl: safetyDecision === 'REJECT' ? undefined : realMock,
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
    return { designs: [], source: 'demo' }
  }

  await connectMongo()
  try {
    const { ensureViralAlgorithmMigration, purgeSvgPlaceholderDesigns } = await import(
      '@/services/trends/purge'
    )
    await ensureViralAlgorithmMigration()
    await purgeSvgPlaceholderDesigns()
  } catch {
    // purge migration is best-effort
  }

  const docs = await Design.find({
    status: { $ne: 'rejected' },
    provider: { $not: /svg|stub/i },
    mimeType: { $ne: 'image/svg+xml' },
    assetUrl: { $not: /design-preview|local:\/\/|example\.invalid/i },
  })
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
  const assetIds = docs.flatMap((d) => {
    const keys: string[] = []
    if (d.assetKey && !String(d.assetKey).startsWith('svg:')) keys.push(String(d.assetKey))
    const fromUrl = (d.assetUrl || '').match(/\/api\/design-assets\/([a-f\d]{24})/i)?.[1]
    if (fromUrl) keys.push(fromUrl)
    return keys
  })
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
    const idFromUrl = assetUrl.match(/\/api\/design-assets\/([a-f\d]{24})/i)?.[1]
    const cachePresent =
      (assetKey && cachedIds.has(assetKey)) || (idFromUrl && cachedIds.has(idFromUrl))
    const missingRaster =
      assetUrl.includes('/api/design-assets/') && Boolean(assetKey || idFromUrl) && !cachePresent
    const stalePrompt =
      Boolean(doc.promptVersion) && doc.promptVersion !== DESIGN_PROMPT_VERSION
    const isSvgProvider =
      (doc.provider || '').includes('svg') ||
      (doc.provider || '').includes('stub') ||
      (doc.model || '').includes('svg') ||
      (doc.model || '').includes('lite') ||
      (doc.model || '').includes('stub') ||
      doc.mimeType === 'image/svg+xml' ||
      assetUrl.includes('design-preview') ||
      assetUrl.startsWith('local://') ||
      assetUrl.includes('example.invalid') ||
      assetKey.startsWith('svg:')
    const hasRasterAsset =
      Boolean(assetUrl) &&
      !isSvgProvider &&
      (assetUrl.includes('/api/design-assets/') || assetUrl.startsWith('https://'))
    // Only true junk counts as placeholder. Never blank a real assetUrl just because cache probe missed.
    const isPlaceholder = isSvgProvider || !hasRasterAsset
    const artworkSrc = hasRasterAsset ? assetUrl : undefined
    const mockupReal = (doc.mockupKeys || []).find(
      (u) => isBrowserSafeAssetUrl(u) && !u.includes('design-preview')
    )
    return {
      id: mongoId,
      ideaId: String(doc.ideaId),
      niche,
      title: doc.title || slogan,
      slogan,
      style: `${doc.provider} · ${doc.model}${stalePrompt ? ' · prompt upgrade available' : ''}${
        missingRaster ? ' · reload asset if blank' : ''
      }`,
      mockupLabel: hasRasterAsset
        ? 'AI print preview'
        : 'Waiting for Gemini flash art — not a product',
      qualityScore: Math.round(doc.qualityScore ?? 70),
      ipRisk: Math.round(doc.ipRisk ?? 5),
      safetyDecision: decision,
      status: (doc.status as DemoDesign['status']) || 'review',
      palette: {
        bg: '#0b1220',
        ink: '#f4f7fb',
        accent:
          niche === 'gaming'
            ? '#5eead4'
            : niche === 'baseball'
              ? '#86efac'
              : niche === 'softball'
                ? '#f0abfc'
                : niche === 'pets'
                  ? '#fb923c'
                  : niche === 'teacher'
                    ? '#fbbf24'
                    : niche === 'nurse'
                      ? '#22d3ee'
                      : niche === 'retro'
                        ? '#c084fc'
                        : niche === 'bookish'
                          ? '#f59e0b'
                          : '#f472b6',
        shirt: '#1e293b',
      },
      source: 'mongo',
      mongoId,
      ideaIdMongo: String(doc.ideaId),
      isPlaceholder,
      concept: conceptByIdea.get(String(doc.ideaId)) || '',
      artworkSrc,
      mockupSrc: mockupReal || artworkSrc,
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
      stats: [
        { label: 'Awaiting approval', value: '0', hint: 'Connect Mongo, then run automation' },
        { label: 'Shopify drafts', value: '0', hint: 'No live publish yet' },
        { label: 'Safety rejects', value: '0', hint: 'REJECT always wins' },
        { label: 'Trend score avg', value: '—', hint: 'Run trend research first' },
      ],
      approvals: [],
      trends: [],
      source: 'demo',
      empty: true,
    }
  }

  await connectMongo()

  try {
    const { ensureViralAlgorithmMigration } = await import('@/services/trends/purge')
    await ensureViralAlgorithmMigration()
  } catch {
    // best-effort wipe on algorithm bump
  }

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
