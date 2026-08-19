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

function isBrowserSafeAssetUrl(url?: string | null): boolean {
  if (!url) return false
  if (url.startsWith('/api/design-assets/')) return true
  if (url.includes('design-preview') || url.startsWith('local://')) return false
  if (!url.startsWith('http://') && !url.startsWith('https://')) return false
  try {
    const host = new URL(url).hostname.toLowerCase()
    if (host === 'example.invalid' || host.endsWith('.invalid') || host === 'localhost') return false
    return true
  } catch {
    return false
  }
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
    includeViralMarketplace: true,
    limitPerNiche: 4,
  })
  const catalog = await ensureDefaultCatalog()
  const persisted = catalog
    ? await persistScoredTrends({
        scored,
        storeId: catalog.storeId,
        brandId: catalog.brandId,
        limit: 40,
      })
    : []

  let researchV2: PipelineJobStats | null = null
  const { getFeatureFlags } = await import('@/lib/featureFlags')
  if (getFeatureFlags().useResearchV2) {
    const { runResearchEngineV2, selectTopOpportunities } = await import(
      '@/services/researchV2/engine'
    )
    const { persistResearchOpportunities } = await import('@/services/researchV2/persist')
    // Reuse scored trends — do not call SerpAPI a second time
    const opportunities = await runResearchEngineV2({
      includeLive: false,
      includeSample: true,
      seedScored: scored,
      limit: 40,
    })
    const top = selectTopOpportunities(opportunities, 25, { excludeHighIpRisk: true })
    const persistedV2 = await persistResearchOpportunities(top, 40)
    researchV2 = {
      engine: 'research_v2',
      opportunities: opportunities.length,
      topPersisted: persistedV2,
      top: top.slice(0, 10).map((o) => ({
        topic: o.topic,
        niche: o.niche,
        opportunityScore: o.scores.opportunityScore,
        commerce: o.scores.commerceScore,
        crossPlatform: o.scores.crossPlatformMomentumScore,
        ipRisk: o.scores.ipRisk,
        sources: o.sources,
      })),
    }
  }

  const diagnostics =
    (scored[0] as { _diagnostics?: unknown } | undefined)?._diagnostics || null

  return {
    scored: scored.length,
    persisted: persisted.length,
    viralMigration: migration,
    serpConfigured: Boolean((getEnv().SERPAPI_API_KEY || '').trim()),
    diagnostics,
    top: scored.slice(0, 5).map((t) => ({
      title: t.signal.title,
      score: t.score,
      source: t.signal.source,
    })),
    researchV2,
  }
}

/** Manual / ops: wipe designs + trend algorithm state and mark Viral Flash applied. */
export async function runViralStatePurgeJob(): Promise<PipelineJobStats> {
  const { purgeViralCreativeState } = await import('@/services/trends/purge')
  const { VIRAL_ALGORITHM_VERSION } = await import('@/services/trends/viralAlgorithm')
  const { DESIGN_PROMPT_VERSION } = await import('@/services/designs/types')
  if (!isMongoConfigured()) {
    return { skipped: true, reason: 'mongo_not_configured', algorithm: VIRAL_ALGORITHM_VERSION }
  }
  const counts = await purgeViralCreativeState()
  return {
    purged: true,
    algorithm: VIRAL_ALGORITHM_VERSION,
    designPrompt: DESIGN_PROMPT_VERSION,
    ...counts,
  }
}

export async function runIdeaGenerationJob(): Promise<PipelineJobStats> {
  const catalog = await ensureDefaultCatalog()
  const { getFeatureFlags } = await import('@/lib/featureFlags')
  const flags = getFeatureFlags()

  // V2 path: research opportunities → multi-concept directions (design-first), not slogan-only.
  if (flags.useResearchV2) {
    const { runResearchEngineV2, selectTopOpportunities } = await import(
      '@/services/researchV2/engine'
    )
    const { reviewContentSafety, passesFirstSafetyGate } = await import(
      '@/services/safety/engine'
    )
    const opportunities = selectTopOpportunities(
      await runResearchEngineV2({
        includeLive: true,
        includeSample: true,
        limit: 30,
      }),
      20,
      { excludeHighIpRisk: true }
    )

    let generated = 0
    let accepted = 0
    let persisted = 0
    const samples: string[] = []
    const rejectedConcepts: Array<{ topic: string; reason: string }> = []

    for (const opp of opportunities) {
      const concepts = opp.topConcepts.slice(0, flags.designConceptsPerOpportunity)
      for (const concept of concepts.slice(0, 2)) {
        generated += 1
        const conceptText = [
          `CONCEPT: ${concept.headline}`,
          `STYLE: ${concept.recommendedStyleId} (score ${concept.recommendedStyleScore})`,
          `AUDIENCE: ${concept.audience}`,
          `HUMOR: ${concept.humor}`,
          `PRODUCT: ${concept.product}`,
          `SECONDARY: ${concept.secondaryText}`,
          `Visual: ${concept.visualStory}`,
          `V2_OPP:${opp.id}`,
          `V2_CONCEPT:${concept.id}`,
        ].join('\n')

        const safety = await reviewContentSafety({
          text: `${concept.primaryText}\n${conceptText}`,
          niche: concept.niche,
          runAiReview: false,
          persistLog: false,
          targetType: 'slogan',
        })

        if (!passesFirstSafetyGate(safety) || opp.scores.ipRisk >= 55) {
          rejectedConcepts.push({
            topic: opp.topic,
            reason: safety.decision === 'REJECT' ? 'safety_reject' : 'ip_or_gate',
          })
          continue
        }

        accepted += 1
        samples.push(concept.primaryText)

        if (catalog) {
          const { Idea } = await import('@/models/Idea')
          const { isMongoConfigured, connectMongo } = await import('@/lib/db')
          if (isMongoConfigured()) {
            await connectMongo()
            await Idea.create({
              storeId: catalog.storeId,
              brandId: catalog.brandId,
              niche: concept.niche,
              slogan: concept.primaryText,
              concept: conceptText,
              productTypes: opp.productTypesRecommended.slice(0, 4),
              status: safety.decision === 'PASS' ? 'approved' : 'awaiting_approval',
              provenance: {
                sourceTrendIds: [opp.topic, opp.id],
                promptVersion: 'concept-engine-v2',
                modelProvider: 'research-v2',
                modelName: opp.engineVersion,
                qualityScore: concept.conceptScore,
                safetyScore: safety.score,
                safetyDecision: safety.decision,
                publishStatus:
                  safety.decision === 'PASS' ? 'approved' : 'awaiting_approval',
              },
            })
            persisted += 1
          }
        }
      }
    }

    return {
      engine: 'research_v2_concepts',
      opportunities: opportunities.length,
      generated,
      accepted,
      persisted,
      rejectedConcepts: rejectedConcepts.slice(0, 10),
      samples: samples.slice(0, 8),
      mongo: Boolean(catalog),
      maxProductsPerDay: flags.maxProductsPerDay,
    }
  }

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
    engine: 'slogan_v1',
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

  const { getFeatureFlags } = await import('@/lib/featureFlags')
  const flags = getFeatureFlags()
  const ideaLimit = flags.useDesignV2
    ? Math.min(10, flags.maxProductsPerDay)
    : 10

  const ideas = await Idea.find({
    status: { $in: ['approved', 'awaiting_approval'] },
    'provenance.safetyDecision': { $ne: 'REJECT' },
  })
    .sort({ createdAt: -1 })
    .limit(ideaLimit)
    .lean()

  bootstrapProviders()
  const image = tryGetProvider('image')
  const canAi =
    Boolean(image) &&
    image!.validateConfig().ok &&
    !image!.name.includes('stub')
  const aiBudget = flags.useDesignV2
    ? Math.min(maxAiDesignsPerRun(), flags.maxProductsPerDay)
    : maxAiDesignsPerRun()

  if (!canAi) {
    logger.warn('design_generation_ai_unavailable', {
      reason: 'image_provider_not_configured',
      hint: 'Set IMAGE_PROVIDER=google and IMAGE_API_KEY or GEMINI_API',
    })
  }

  let created = 0
  let cached = 0
  let aiUsed = 0
  let skippedExisting = 0
  let upgradedPlaceholders = 0

  for (const idea of ideas) {
    const ideaId = String(idea._id)
    const existing = await Design.findOne().where('ideaId').equals(idea._id).lean()
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

    // Already have a placeholder — delete it and keep trying AI (do not keep garbage)
    if (existing && placeholder) {
      await Design.deleteOne({ _id: existing._id })
    }

    // NEVER persist boring SVG stand-ins — they look like finished merch and poison the gallery
    if (!canAi) {
      logger.warn('design_generation_blocked_no_image_ai', {
        ideaId,
        hint: 'Set IMAGE_PROVIDER=google and IMAGE_API_KEY / GEMINI_API',
      })
      skippedExisting += 1
      continue
    }

    logger.info('design_generation_deferred_no_svg', {
      ideaId,
      reason: aiUsed >= aiBudget ? 'ai_budget' : 'ai_failure',
    })
    skippedExisting += 1
  }

  // Final sweep: any leftover SVG junk from older deploys
  try {
    const { purgeSvgPlaceholderDesigns } = await import('@/services/trends/purge')
    await purgeSvgPlaceholderDesigns()
  } catch {
    // ignore
  }

  return {
    candidates: ideas.length,
    created,
    cached,
    svgFallback: 0,
    aiUsed,
    skippedExisting,
    upgradedPlaceholders,
    canAi,
    aiBudget,
    svgPersistenceDisabled: true,
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

  // Only real AI rasters — never attach bland design-preview SVG as a "mockup"
  const designs = await Design.find({
    status: { $nin: ['rejected'] },
    provider: { $not: /svg|stub/i },
    mimeType: { $ne: 'image/svg+xml' },
    assetUrl: { $not: /design-preview|local:\/\/|example\.invalid/i },
  })
    .sort({ createdAt: -1 })
    .limit(25)

  let updated = 0
  let skippedSvg = 0
  for (const design of designs) {
    if (isSvgPlaceholderDesign(design)) {
      skippedSvg += 1
      continue
    }
    const art = design.assetUrl
    if (!art || art.includes('design-preview') || !isBrowserSafeAssetUrl(art)) {
      skippedSvg += 1
      continue
    }
    // Use the AI print itself as the mockup panel until a real tee renderer exists
    const cleaned = (design.mockupKeys || []).filter((u) => !u.includes('design-preview'))
    if (!cleaned.includes(art)) {
      design.mockupKeys = [...cleaned, art]
      await design.save()
      updated += 1
    } else if (cleaned.length !== (design.mockupKeys || []).length) {
      design.mockupKeys = cleaned
      await design.save()
      updated += 1
    }
  }

  return { updated, scanned: designs.length, skippedSvg }
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
