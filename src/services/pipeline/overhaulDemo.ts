import { getFeatureFlags } from '@/lib/featureFlags'
import { resolveAutomationMode } from '@/services/automation/modes'
import {
  runResearchEngineV2,
  selectTopOpportunities,
} from '@/services/researchV2/engine'
import { runDesignEngineV2 } from '@/services/designV2/engine'
import { buildDesignDNA } from '@/services/productIntelligenceV2/engine'
import type { ResearchOpportunity } from '@/services/researchV2/types'
import type { DesignEngineV2Result } from '@/services/designV2/types'

export type OverhaulPipelineReport = {
  mode: string
  flags: ReturnType<typeof getFeatureFlags>
  topOpportunities: Array<{
    id: string
    topic: string
    niche: string
    opportunityScore: number
    scores: ResearchOpportunity['scores']
    sources: string[]
    evidence: string[]
    selectedConcept?: {
      headline: string
      primaryText: string
      style: string
      conceptScore: number
      visualStory: string
    }
    designRun?: {
      selected: Array<{
        style: string
        primaryText: string
        overallScore: number
        decision: string
        visualImpact: number
        typography: number
        commercialAppeal: number
      }>
      rejected: Array<{
        style: string
        primaryText: string
        overallScore: number
        reasons: string[]
      }>
      designDna?: ReturnType<typeof buildDesignDNA>
    }
    readyForApproval: boolean
  }>
  summary: {
    opportunitiesScored: number
    conceptsGenerated: number
    designsReviewed: number
    designsAccepted: number
    designsRejected: number
    readyForApproval: number
  }
  generatedAt: string
}

/**
 * End-to-end V2 research → concepts → multi-direction design review (pre-image).
 * Does not call paid image APIs — scores creative briefs so the overhaul can be verified offline.
 * Image generation remains in the normal design_generation job under MAX_PRODUCTS_PER_DAY.
 */
export async function runOverhaulPipelineDemo(options: {
  limit?: number
  includeLive?: boolean
} = {}): Promise<OverhaulPipelineReport> {
  const flags = getFeatureFlags()
  const mode = resolveAutomationMode()
  const limit = options.limit ?? 20

  const opportunities = selectTopOpportunities(
    await runResearchEngineV2({
      includeLive: options.includeLive ?? false,
      includeSample: true,
      limit: Math.max(limit, 20),
    }),
    limit,
    { excludeHighIpRisk: false }
  )

  let conceptsGenerated = 0
  let designsReviewed = 0
  let designsAccepted = 0
  let designsRejected = 0
  let readyForApproval = 0

  const topOpportunities: OverhaulPipelineReport['topOpportunities'] = []

  for (const opp of opportunities) {
    conceptsGenerated += opp.topConcepts.length
    const designRun: DesignEngineV2Result = runDesignEngineV2({ opportunity: opp })
    designsReviewed += designRun.directions.length
    designsAccepted += designRun.accepted.length
    designsRejected += designRun.rejected.length

    const best = designRun.selected[0]
    const ready = Boolean(
      best &&
        best.preImageReview.decision !== 'REJECT' &&
        best.preImageReview.scores.overallScore >= flags.minDesignOverallScore &&
        opp.scores.ipRisk < 50 &&
        opp.scores.commerceScore >= 45
    )
    if (ready) readyForApproval += 1

    const concept = opp.topConcepts[0]
    topOpportunities.push({
      id: opp.id,
      topic: opp.topic,
      niche: opp.niche,
      opportunityScore: opp.scores.opportunityScore,
      scores: opp.scores,
      sources: opp.sources,
      evidence: [
        ...opp.records.flatMap((r) => r.visualPatterns.slice(0, 2)),
        ...opp.records.flatMap((r) => r.recurringPhrases.slice(0, 2)),
        opp.scores.explanation.slice(0, 220),
      ].slice(0, 8),
      selectedConcept: concept
        ? {
            headline: concept.headline,
            primaryText: concept.primaryText,
            style: String(concept.recommendedStyleId),
            conceptScore: concept.conceptScore,
            visualStory: concept.visualStory,
          }
        : undefined,
      designRun: {
        selected: designRun.selected.map((d) => ({
          style: d.brief.styleLabel,
          primaryText: d.brief.primaryText,
          overallScore: d.preImageReview.scores.overallScore,
          decision: d.preImageReview.decision,
          visualImpact: d.preImageReview.scores.visualImpact,
          typography: d.preImageReview.scores.typography,
          commercialAppeal: d.preImageReview.scores.commercialAppeal,
        })),
        rejected: designRun.rejected.slice(0, 4).map((d) => ({
          style: d.brief.styleLabel,
          primaryText: d.brief.primaryText,
          overallScore: d.preImageReview.scores.overallScore,
          reasons: d.preImageReview.reasons,
        })),
        designDna: best
          ? buildDesignDNA(best.brief, {
              visualImpact: best.preImageReview.scores.visualImpact,
              commercialAppeal: best.preImageReview.scores.commercialAppeal,
            })
          : undefined,
      },
      readyForApproval: ready,
    })
  }

  return {
    mode: mode.mode,
    flags,
    topOpportunities,
    summary: {
      opportunitiesScored: opportunities.length,
      conceptsGenerated,
      designsReviewed,
      designsAccepted,
      designsRejected,
      readyForApproval,
    },
    generatedAt: new Date().toISOString(),
  }
}

export function formatOverhaulReportMarkdown(report: OverhaulPipelineReport): string {
  const lines: string[] = [
    '# Overhaul V2 pipeline run',
    '',
    `Generated: ${report.generatedAt}`,
    `Mode: **${report.mode}** (default stays review; human approval on)`,
    '',
    '## Summary',
    '',
    `- Opportunities scored: ${report.summary.opportunitiesScored}`,
    `- Concepts generated: ${report.summary.conceptsGenerated}`,
    `- Design directions reviewed: ${report.summary.designsReviewed}`,
    `- Accepted directions: ${report.summary.designsAccepted}`,
    `- Rejected directions: ${report.summary.designsRejected}`,
    `- Ready for human approval: ${report.summary.readyForApproval}`,
    '',
    '## Top opportunities',
    '',
  ]

  for (const [i, opp] of report.topOpportunities.entries()) {
    lines.push(`### ${i + 1}. ${opp.topic} (${opp.niche})`)
    lines.push('')
    lines.push(
      `- OpportunityScore: **${opp.opportunityScore}** | commerce ${opp.scores.commerceScore} | velocity ${opp.scores.velocityScore} | cross-platform ${opp.scores.crossPlatformMomentumScore} | design ${opp.scores.designScore} | IP ${opp.scores.ipRisk}`
    )
    lines.push(`- Sources: ${opp.sources.join(', ') || 'n/a'}`)
    lines.push(`- Evidence: ${opp.evidence.slice(0, 4).join(' · ')}`)
    if (opp.selectedConcept) {
      lines.push(
        `- Concept: ${opp.selectedConcept.headline} — "${opp.selectedConcept.primaryText}" [${opp.selectedConcept.style}] (concept ${opp.selectedConcept.conceptScore})`
      )
    }
    if (opp.designRun?.selected.length) {
      for (const d of opp.designRun.selected) {
        lines.push(
          `- Design selected: ${d.style} / "${d.primaryText}" → overall ${d.overallScore} (${d.decision}) impact ${d.visualImpact} type ${d.typography} commercial ${d.commercialAppeal}`
        )
      }
    }
    if (opp.designRun?.rejected.length) {
      for (const d of opp.designRun.rejected) {
        lines.push(
          `- Rejected: ${d.style} / "${d.primaryText}" (${d.overallScore}) — ${d.reasons.join(', ')}`
        )
      }
    }
    lines.push(`- Ready for approval: ${opp.readyForApproval ? 'YES' : 'no'}`)
    lines.push('')
  }

  lines.push('## Notes')
  lines.push('')
  lines.push(
    'This run validates Research Engine V2 + Design Engine V2 creative briefs and quality gates without spending image API budget. Run Design generation in the dashboard to produce final assets for approval-ready items (capped by MAX_PRODUCTS_PER_DAY).'
  )
  lines.push('')

  return lines.join('\n')
}
