import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { getFeatureFlags } from '@/lib/featureFlags'
import { resetEnvCache } from '@/lib/env'
import {
  crossPlatformMomentumScore,
  scoreResearchOpportunity,
  detectPurchaseIntentLanguage,
} from '@/services/researchV2/score'
import {
  buildOpportunitiesFromSample,
  selectTopOpportunities,
} from '@/services/researchV2/engine'
import { generateConceptCombinations, buildTrendCluster } from '@/services/researchV2/concepts'
import { listDesignStyles, recommendStylesForNiche } from '@/services/researchV2/styleLibrary'
import { runDesignEngineV2 } from '@/services/designV2/engine'
import { reviewDesignV2 } from '@/services/designV2/review'
import { buildCreativeBrief, buildImagePromptFromBrief } from '@/services/designV2/brief'
import {
  formatOverhaulReportMarkdown,
  runOverhaulPipelineDemo,
} from '@/services/pipeline/overhaulDemo'
import { resolveAutomationMode } from '@/services/automation/modes'
import {
  buildDesignDNA,
  proposeWinnerVariations,
  summarizeIntelligence,
  recordDesignDNAPerformance,
} from '@/services/productIntelligenceV2/engine'

describe('overhaul V2 research + design', () => {
  afterEach(() => {
    delete process.env.USE_RESEARCH_V2
    delete process.env.USE_DESIGN_V2
    delete process.env.ALLOW_AUTO_MODE
    delete process.env.AUTOMATION_MODE
    resetEnvCache()
  })

  it('exposes V2 feature flags with conservative quality defaults', () => {
    resetEnvCache()
    const flags = getFeatureFlags()
    expect(flags.useResearchV2).toBe(true)
    expect(flags.useDesignV2).toBe(true)
    expect(flags.useProductIntelligenceV2).toBe(true)
    expect(flags.maxProductsPerDay).toBeLessThanOrEqual(10)
    expect(flags.minDesignOverallScore).toBeGreaterThanOrEqual(85)
    expect(flags.humanApproval).toBe(true)
    expect(flags.autoPublish).toBe(false)
  })

  it('defaults automation to review mode and blocks auto without explicit allow', () => {
    process.env.AUTOMATION_MODE = 'auto'
    delete process.env.ALLOW_AUTO_MODE
    expect(resolveAutomationMode().mode).toBe('review')
    process.env.ALLOW_AUTO_MODE = 'true'
    expect(resolveAutomationMode('auto').mode).toBe('auto')
  })

  it('scores cross-platform momentum and purchase-intent language', () => {
    expect(crossPlatformMomentumScore(['etsy'])).toBeLessThan(
      crossPlatformMomentumScore(['etsy', 'serpapi', 'google_trends', 'curated'])
    )
    const intent = detectPurchaseIntentLanguage('I need this shirt take my money')
    expect(intent.hits.length).toBeGreaterThanOrEqual(2)
    expect(intent.score).toBeGreaterThan(40)
  })

  it('penalizes licensed IP opportunities vs commerce+design winners', () => {
    const sample = buildOpportunitiesFromSample(20)
    const safe = sample.find((o) => o.topic.includes('orange cat'))
    const risky = sample.find((o) => o.topic.includes('NFL'))
    expect(safe).toBeTruthy()
    expect(risky).toBeTruthy()
    expect(risky!.scores.ipRisk).toBeGreaterThan(40)
    expect(risky!.scores.opportunityScore).toBeLessThan(safe!.scores.opportunityScore)
  })

  it('builds trend clusters and concept combinations', () => {
    const cluster = buildTrendCluster('cats', 'pets')
    expect(cluster.subTrends.length).toBeGreaterThan(3)
    const concepts = generateConceptCombinations({ topic: 'Funny cat behavior', niche: 'pets', limit: 8 })
    expect(concepts.length).toBe(8)
    expect(concepts[0]!.conceptScore).toBeGreaterThanOrEqual(concepts[concepts.length - 1]!.conceptScore)
    expect(concepts[0]!.visualStory.toLowerCase()).toContain('illustration')
  })

  it('has a design style library with niche matching', () => {
    const styles = listDesignStyles()
    expect(styles.length).toBeGreaterThanOrEqual(25)
    const gaming = recommendStylesForNiche('gaming', 3)
    expect(gaming.some((s) => s.id.includes('arcade') || s.id.includes('cyber') || s.id.includes('neon'))).toBe(
      true
    )
  })

  it('rejects weak text-only briefs and accepts strong creative-director briefs', () => {
    const strongConcept = generateConceptCombinations({
      topic: 'One more game night owl',
      niche: 'gaming',
      limit: 1,
    })[0]!
    const brief = buildCreativeBrief(strongConcept)
    const built = buildImagePromptFromBrief(brief)
    const pass = reviewDesignV2({
      brief,
      prompt: built.prompt,
      negativePrompt: built.negativePrompt,
      bytesLength: 120_000,
      mimeType: 'image/png',
    })
    expect(pass.scores.overallScore).toBeGreaterThanOrEqual(80)
    expect(['PASS', 'REVIEW']).toContain(pass.decision)

    const weak = reviewDesignV2({
      brief: {
        ...brief,
        composition: 'plain text only minimalist slogan on white',
        visualDominancePct: 10,
        typographyDominancePct: 90,
        primaryText: 'X',
      },
      prompt: 'make a funny shirt',
      negativePrompt: '',
    })
    expect(weak.decision).toBe('REJECT')
  })

  it('runs design engine v2 multi-direction selection', () => {
    const opp = selectTopOpportunities(buildOpportunitiesFromSample(5), 1)[0]!
    const result = runDesignEngineV2({ opportunity: opp })
    expect(result.directions.length).toBeGreaterThanOrEqual(2)
    expect(result.selected.length).toBeLessThanOrEqual(2)
    expect(result.engineVersion).toContain('design-engine-v2')
  })

  it('builds design DNA and winner variations for product intelligence', () => {
    const concept = generateConceptCombinations({ topic: 'Dog mom', niche: 'pets', limit: 1 })[0]!
    const brief = buildCreativeBrief(concept)
    const dna = buildDesignDNA(brief, { visualImpact: 90, commercialAppeal: 88 })
    expect(dna.style).toBeTruthy()
    expect(proposeWinnerVariations(dna).length).toBeGreaterThanOrEqual(5)
    const row = recordDesignDNAPerformance({
      dna,
      performance: { purchases: 3, revenue: 90, conversion: 2, clicks: 200, addToCart: 8 },
    })
    const summary = summarizeIntelligence([row])
    expect(summary.bestNiches[0]?.niche).toBe('pets')
  })

  it('runs full overhaul demo on 20 opportunities and writes report', async () => {
    const report = await runOverhaulPipelineDemo({ limit: 20, includeLive: false })
    expect(report.topOpportunities.length).toBe(20)
    expect(report.summary.opportunitiesScored).toBe(20)
    expect(report.summary.designsReviewed).toBeGreaterThan(20)
    expect(report.mode).toBe('review')

    const ready = report.topOpportunities.filter((o) => o.readyForApproval)
    expect(ready.length).toBeGreaterThan(0)

    const md = formatOverhaulReportMarkdown(report)
    const docsDir = join(process.cwd(), 'docs')
    mkdirSync(docsDir, { recursive: true })
    writeFileSync(join(docsDir, '21-OVERHAUL-PIPELINE-RUN.md'), md, 'utf8')
    writeFileSync(
      join(docsDir, '21-OVERHAUL-PIPELINE-RUN.json'),
      JSON.stringify(report, null, 2),
      'utf8'
    )

    expect(md).toContain('Top opportunities')
    expect(md).toContain('Ready for human approval')
  })

  it('scoreResearchOpportunity formula prefers commerce+design over pure velocity spam', () => {
    const viralWeakCommerce = scoreResearchOpportunity({
      niche: 'humor',
      topic: 'random meme spike',
      sources: ['curated'],
      records: [
        {
          topic: 'random meme spike',
          niche: 'humor',
          source: 'curated',
          detectedAt: new Date().toISOString(),
          trendVelocity: 95,
          searchInterest: 90,
          engagementSignals: 90,
          commercialSignals: 20,
          buyerIntent: 15,
          seasonality: 10,
          competition: 90,
          visualPatterns: [],
          recurringPhrases: [],
          productTypes: ['tshirt'],
          audience: 'meme',
          demographicSignals: [],
          designPatterns: [],
          riskSignals: [],
        },
      ],
    })
    const balanced = scoreResearchOpportunity({
      niche: 'pets',
      topic: 'cat mom gift',
      sources: ['etsy', 'serpapi', 'curated'],
      records: [
        {
          topic: 'cat mom gift',
          niche: 'pets',
          source: 'etsy',
          detectedAt: new Date().toISOString(),
          trendVelocity: 65,
          searchInterest: 70,
          engagementSignals: 60,
          commercialSignals: 85,
          buyerIntent: 80,
          seasonality: 40,
          competition: 55,
          visualPatterns: ['mascot cat', 'banner type'],
          recurringPhrases: ['perfect gift', 'need this'],
          productTypes: ['tshirt', 'mug'],
          audience: 'cat parents',
          demographicSignals: ['gift'],
          designPatterns: ['mascot illustration'],
          riskSignals: [],
        },
      ],
    })
    expect(balanced.opportunityScore).toBeGreaterThan(viralWeakCommerce.opportunityScore)
  })
})
