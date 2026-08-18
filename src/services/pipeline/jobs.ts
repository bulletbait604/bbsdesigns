import { isMongoConfigured, connectMongo } from '@/lib/db'
import { Idea } from '@/models/Idea'
import { Design } from '@/models/Design'
import { bootstrapProviders } from '@/providers/bootstrap'
import { tryGetProvider } from '@/providers/registry'
import { ensureDefaultCatalog } from '@/services/catalog/defaults'
import { runTrendEngine } from '@/services/trends/engine'
import { persistScoredTrends } from '@/services/trends/persist'
import { runSloganEngine } from '@/services/slogans/engine'
import { persistAcceptedSlogans } from '@/services/slogans/persist'
import { reviewContentSafety } from '@/services/safety/engine'
import { runDesignEngine } from '@/services/designs/engine'
import {
  buildDesignCacheKey,
  findCachedDesign,
  saveCachedDesign,
} from '@/services/designs/cache'
import { upsertDesignResult } from '@/services/designs/persist'
import { storeDesignAsset } from '@/services/designs/assetStore'
import { prepareListing } from '@/services/listings/prepare'
import { enqueuePublishingCandidate, listPublishingQueue } from '@/services/publishing/queue'
import { getEnv } from '@/lib/env'
import { logger } from '@/lib/logger'
import type { Niche } from '@/types'
import type { SafetyDecision } from '@/types'
import { DESIGN_PROMPT_VERSION } from '@/services/designs/types'
import { resolveConfiguredImageModel } from '@/providers/image/google'

const DEFAULT_MAX_AI_DESIGNS_PER_RUN = 10

function maxAiDesignsPerRun(): number {
  const raw = Number(process.env.MAX_AI_DESIGNS_PER_RUN || DEFAULT_MAX_AI_DESIGNS_PER_RUN)
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_MAX_AI_DESIGNS_PER_RUN
  return Math.min(20, Math.floor(raw))
}

function isSvgPlaceholderDesign(doc: {
  provider?: string | null
  mimeType?: string | null
  assetUrl?: string | null
  model?: string | null
  promptVersion?: string | null
}): boolean {
  const provider = (doc.provider || '').toLowerCase()
  const model = (doc.model || '').toLowerCase()
  const url = (doc.assetUrl || '').toLowerCase()
  const stalePrompt = Boolean(doc.promptVersion) && doc.promptVersion !== DESIGN_PROMPT_VERSION
  return (
    provider.includes('svg') ||
    provider.includes('stub') ||
    model.includes('svg') ||
    model.includes('lite') ||
    model.includes('stub') ||
    // Upgrade older Flash-model art to Pro quality
    (model.includes('flash-image') && !model.includes('pro')) ||
    doc.mimeType === 'image/svg+xml' ||
    url.includes('/api/design-preview') ||
    url.startsWith('local://') ||
    url.includes('example.invalid') ||
    stalePrompt
  )
}

export type PipelineJobStats = Record<string, unknown>

function previewUrlFor(slogan: string, niche: Niche, view: 'artwork' | 'mockup' = 'artwork'): string {
  const q = new URLSearchParams({
    slogan,
    niche,
    view,
  })
  return `/api/design-preview?${q.toString()}`
}

async function topTrendTitles(): Promise<{ niche: Niche; title: string; score: number }[]> {
  bootstrapProviders()
  const scored = await runTrendEngine({
    includeCurated: true,
    includeRegisteredTrendProvider: true,
    limitPerNiche: 3,
  })
  const byNiche = new Map<Niche, { niche: Niche; title: string; score: number }>()
  for (const s of scored.sort((a, b) => b.score - a.score)) {
    if (!byNiche.has(s.signal.niche)) {
      byNiche.set(s.signal.niche, {
        niche: s.signal.niche,
        title: s.signal.title,
        score: s.score,
      })
    }
  }
  return [...byNiche.values()]
}

export async function runTrendPersistJob(): Promise<PipelineJobStats> {
  bootstrapProviders()
  const { ensureViralAlgorithmMigration } = await import('@/services/trends/purge')
  const migration = await ensureViralAlgorithmMigration()

  const scored = await runTrendEngine({
    includeCurated: true,
    includeRegisteredTrendProvider: true,
    limitPerNiche: 5,
  })
  const catalog = await ensureDefaultCatalog()
  const persisted = catalog
    ? await persistScoredTrends({
        scored,
        storeId: catalog.storeId,
        brandId: catalog.brandId,
        limit: 30,
      })
    : []

  return {
    scored: scored.length,
    persisted: persisted.length,
    viralMigration: migration,
    top: scored.slice(0, 5).map((t) => ({
      title: t.signal.title,
      score: t.score,
      source: t.signal.source,
    })),
  }
}

/** Manual / ops: wipe designs + trend algorithm state and mark Viral Flash applied. */
export async function runViralStatePurgeJob(): Promise<PipelineJobStats> {
  const { purgeViralCreativeState } = await import('@/services/trends/purge')
  const { VIRAL_ALGORITHM_VERSION } = await import('@/services/trends/viralAlgorithm')
  if (!isMongoConfigured()) {
    return { skipped: true, reason: 'mongo_not_configured', algorithm: VIRAL_ALGORITHM_VERSION }
  }
  const counts = await purgeViralCreativeState()
  return { purged: true, algorithm: VIRAL_ALGORITHM_VERSION, ...counts }
}

export async function runIdeaGenerationJob(): Promise<PipelineJobStats> {
  const catalog = await ensureDefaultCatalog()
  const tops = await topTrendTitles()
  let generated = 0
  let accepted = 0
  let persisted = 0
  const samples: string[] = []

  for (const top of tops) {
    const result = await runSloganEngine({
      niche: top.niche,
      trendTitle: top.title,
      limit: 3,
      runAiReview: false,
    })
    generated += result.generated.length
    accepted += result.accepted.length
    samples.push(...result.accepted.slice(0, 1).map((c) => c.slogan))

    if (catalog && result.accepted.length) {
      const ids = await persistAcceptedSlogans({
        candidates: result.accepted,
        storeId: catalog.storeId,
        brandId: catalog.brandId,
      })
      persisted += ids.length
    }
  }

  return {
    niches: tops.length,
    generated,
    accepted,
    persisted,
    samples,
    mongo: Boolean(catalog),
  }
}

export async function runSafetyReviewJob(): Promise<PipelineJobStats> {
  if (!isMongoConfigured()) {
    return { skipped: true, reason: 'mongo_not_configured' }
  }
  await connectMongo()
  const catalog = await ensureDefaultCatalog()
  const ideas = await Idea.find({
    status: { $in: ['draft', 'awaiting_approval'] },
  })
    .sort({ createdAt: -1 })
    .limit(25)
    .lean()

  let pass = 0
  let review = 0
  let reject = 0

  for (const idea of ideas) {
    const safety = await reviewContentSafety({
      text: `${idea.slogan}\n${idea.concept || ''}`,
      niche: idea.niche as Niche,
      runAiReview: false,
      persistLog: true,
      targetType: 'slogan',
      targetId: String(idea._id),
      storeId: catalog?.storeId,
      brandId: catalog?.brandId,
    })

    const status =
      safety.decision === 'REJECT'
        ? 'rejected'
        : safety.decision === 'PASS'
          ? 'approved'
          : 'awaiting_approval'

    await Idea.updateOne(
      { _id: idea._id },
      {
        $set: {
          status,
          'provenance.safetyScore': safety.score,
          'provenance.safetyDecision': safety.decision,
          'provenance.publishStatus': status,
        },
      }
    )

    if (safety.decision === 'PASS') pass += 1
    else if (safety.decision === 'REJECT') reject += 1
    else review += 1
  }

  return { reviewed: ideas.length, pass, review, reject }
}

export async function runDesignGenerationJob(): Promise<PipelineJobStats> {
  if (!isMongoConfigured()) {
    return { skipped: true, reason: 'mongo_not_configured' }
  }
  await connectMongo()
  const catalog = await ensureDefaultCatalog()
  if (!catalog) return { skipped: true, reason: 'no_catalog' }

  const ideas = await Idea.find({
    status: { $in: ['approved', 'awaiting_approval'] },
    'provenance.safetyDecision': { $ne: 'REJECT' },
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean()

  bootstrapProviders()
  const image = tryGetProvider('image')
  const canAi =
    Boolean(image) &&
    image!.validateConfig().ok &&
    !image!.name.includes('stub')
  const aiBudget = maxAiDesignsPerRun()

  if (!canAi) {
    logger.warn('design_generation_ai_unavailable', {
      reason: 'image_provider_not_configured',
      hint: 'Set IMAGE_PROVIDER=google and IMAGE_API_KEY or GEMINI_API',
    })
  }

  let created = 0
  let cached = 0
  let svgFallback = 0
  let aiUsed = 0
  let skippedExisting = 0
  let upgradedPlaceholders = 0

  for (const idea of ideas) {
    const ideaId = String(idea._id)
    const existing = await Design.findOne({ ideaId }).lean()
    const placeholder = existing ? isSvgPlaceholderDesign(existing) : false

    // Keep real AI / stored raster designs; replace SVG word placeholders when AI is available
    if (existing && !placeholder) {
      skippedExisting += 1
      continue
    }

    const niche = idea.niche as Niche
    const slogan = idea.slogan
    const concept =
      idea.concept ||
      `Visual: maximalist original ${niche} cartoon hero locked into flashy bubble/varsity lettering — inseparable art+text, neon accents, heavy drop shadows.`
    const cacheKey = buildDesignCacheKey({
      niche,
      slogan,
      concept,
      model: resolveConfiguredImageModel(),
    })

    const hit = await findCachedDesign(cacheKey)
    if (
      hit &&
      hit.design.mimeType !== 'image/svg+xml' &&
      hit.design.promptVersion === DESIGN_PROMPT_VERSION
    ) {
      storeDesignAsset({
        bytes: hit.bytes,
        mimeType: hit.design.mimeType,
        slogan,
        niche,
        id: hit.id,
      })
      hit.design.assetUrl = hit.previewUrl
      hit.design.assetKey = hit.id
      await upsertDesignResult({
        result: { design: hit.design, review: hit.review, bytes: hit.bytes, publishAllowed: false },
        storeId: catalog.storeId,
        brandId: catalog.brandId,
        ideaId,
      })
      if (placeholder) upgradedPlaceholders += 1
      cached += 1
      created += 1
      continue
    }

    if (canAi && aiUsed < aiBudget) {
      try {
        const result = await runDesignEngine({
          slogan,
          niche,
          concept,
          ideaId,
        })
        const mongoId = await saveCachedDesign({ cacheKey, niche, slogan, concept, result })
        if (!mongoId) {
          throw new Error('design_cache_save_failed')
        }
        const stored = storeDesignAsset({
          bytes: result.bytes,
          mimeType: result.design.mimeType,
          slogan,
          niche,
          id: mongoId,
        })
        result.design.assetUrl = `/api/design-assets/${stored.id}`
        result.design.assetKey = stored.id
        await upsertDesignResult({
          result,
          storeId: catalog.storeId,
          brandId: catalog.brandId,
          ideaId,
        })
        if (placeholder) upgradedPlaceholders += 1
        aiUsed += 1
        created += 1
        continue
      } catch (error) {
        logger.warn('design_generation_ai_failed', {
          ideaId,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }

    // Already have a placeholder — don't duplicate
    if (existing && placeholder) {
      skippedExisting += 1
      continue
    }

    // When AI is configured, never persist boring SVG stand-ins — leave the idea for a later run
    if (canAi) {
      logger.info('design_generation_deferred_no_svg', { ideaId, reason: 'ai_budget_or_failure' })
      skippedExisting += 1
      continue
    }

    // SVG illustrated placeholder — last resort only when AI is unavailable
    const artwork = previewUrlFor(slogan, niche, 'artwork')
    const mockup = previewUrlFor(slogan, niche, 'mockup')
    await Design.create({
      storeId: catalog.storeId,
      brandId: catalog.brandId,
      ideaId,
      niche,
      title: slogan,
      slogan,
      provider: 'svg-preview',
      model: 'local-svg',
      prompt: `Illustrated SVG placeholder for: ${slogan}`,
      negativePrompt: '',
      promptVersion: 'svg-preview-v2',
      assetKey: `svg:${ideaId}`,
      assetUrl: artwork,
      mimeType: 'image/svg+xml',
      width: 1024,
      height: 1024,
      mockupKeys: [mockup],
      qualityScore: 55,
      ipRisk: idea.provenance?.safetyDecision === 'PASS' ? 5 : 20,
      safetyScore: idea.provenance?.safetyScore ?? 80,
      imageReviewDecision: 'REVIEW',
      status: 'review',
      provenance: {
        sourceTrendIds: idea.provenance?.sourceTrendIds || [],
        ideaId,
        promptVersion: 'svg-preview-v2',
        modelProvider: 'svg-preview',
        modelName: 'local-svg',
        imageAssetKey: `svg:${ideaId}`,
        qualityScore: 55,
        safetyScore: idea.provenance?.safetyScore ?? null,
        safetyDecision: 'REVIEW',
        publishStatus: 'awaiting_approval',
      },
    })
    svgFallback += 1
    created += 1
  }

  return {
    candidates: ideas.length,
    created,
    cached,
    svgFallback,
    aiUsed,
    skippedExisting,
    upgradedPlaceholders,
    canAi,
    aiBudget,
  }
}

export async function runImageReviewJob(): Promise<PipelineJobStats> {
  if (!isMongoConfigured()) {
    return { skipped: true, reason: 'mongo_not_configured' }
  }
  await connectMongo()

  const designs = await Design.find({
    status: { $in: ['generated', 'review'] },
  })
    .sort({ createdAt: -1 })
    .limit(25)

  let pass = 0
  let review = 0
  let reject = 0

  for (const design of designs) {
    const decision = (design.imageReviewDecision || 'REVIEW') as SafetyDecision
    if (decision === 'PASS' || (design.qualityScore ?? 0) >= getEnv().MIN_DESIGN_QUALITY_SCORE) {
      design.imageReviewDecision = design.imageReviewDecision || 'PASS'
      design.status = 'review'
      pass += 1
    } else if (decision === 'REJECT') {
      design.status = 'rejected'
      reject += 1
    } else {
      design.status = 'review'
      review += 1
    }
    await design.save()
  }

  return { reviewed: designs.length, pass, review, reject }
}

export async function runMockupsJob(): Promise<PipelineJobStats> {
  if (!isMongoConfigured()) {
    return { skipped: true, reason: 'mongo_not_configured' }
  }
  await connectMongo()

  const designs = await Design.find({
    status: { $nin: ['rejected'] },
  })
    .sort({ createdAt: -1 })
    .limit(25)

  let updated = 0
  for (const design of designs) {
    const mockup = previewUrlFor(design.slogan || design.title, design.niche as Niche, 'mockup')
    if (!design.mockupKeys?.includes(mockup)) {
      design.mockupKeys = [...(design.mockupKeys || []), mockup]
      await design.save()
      updated += 1
    }
  }

  return { updated, scanned: designs.length }
}

export async function runListingPreparationJob(): Promise<PipelineJobStats> {
  if (!isMongoConfigured()) {
    return { skipped: true, reason: 'mongo_not_configured' }
  }
  await connectMongo()

  const designs = await Design.find({
    status: { $in: ['generated', 'review', 'approved'] },
    imageReviewDecision: { $ne: 'REJECT' },
  })
    .sort({ createdAt: -1 })
    .limit(15)
    .lean()

  let enqueued = 0
  let ready = 0
  let rejected = 0

  for (const design of designs) {
    const idea = await Idea.findById(design.ideaId).lean()
    const sloganSafety = (idea?.provenance?.safetyDecision ||
      design.provenance?.safetyDecision ||
      'REVIEW') as SafetyDecision
    const imageSafety = (design.imageReviewDecision || 'REVIEW') as SafetyDecision
    const mediaUrls = [design.assetUrl, ...(design.mockupKeys || [])].filter(Boolean)

    const listing = prepareListing({
      niche: design.niche as Niche,
      slogan: design.slogan || design.title,
      concept: idea?.concept || '',
      mediaUrls,
      ideaId: String(design.ideaId),
      designId: String(design._id),
    })

    const item = enqueuePublishingCandidate({
      title: listing.title,
      description: listing.description,
      tags: listing.tags,
      priceCents: listing.priceCents,
      mediaUrls: listing.mediaUrls,
      variantSkus: listing.variantSkus,
      sloganSafety,
      imageSafety,
      qualityScore: design.qualityScore ?? 0,
      idempotencyKey: `listing:${String(design._id)}`,
      storeId: String(design.storeId),
      brandId: String(design.brandId),
      ideaId: String(design.ideaId),
      designId: String(design._id),
      niche: design.niche as Niche,
    })

    enqueued += 1
    if (item.status === 'READY_FOR_REVIEW') ready += 1
    if (item.status === 'REJECTED') rejected += 1
  }

  return {
    enqueued,
    ready,
    rejected,
    queueSize: listPublishingQueue().length,
  }
}

export async function runPublishingGateJob(): Promise<PipelineJobStats> {
  const env = getEnv()
  const queue = listPublishingQueue()
  const ready = queue.filter((q) => q.status === 'READY_FOR_REVIEW' || q.status === 'APPROVED')
  return {
    autoPublish: env.AUTO_PUBLISH,
    humanApproval: env.HUMAN_APPROVAL,
    readyForReview: ready.length,
    note: 'Manual approve + publish required while AUTO_PUBLISH=false',
  }
}
