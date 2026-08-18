import { NextResponse } from 'next/server'
import { getEnv, missingOptionalIntegrations } from '@/lib/env'
import { isMongoConfigured } from '@/lib/db'
import { logger } from '@/lib/logger'
import { bootstrapProviders } from '@/providers/bootstrap'
import { healthCheckAll, listProviders } from '@/providers/registry'
import { assessAutonomyReadiness } from '@/services/automation/readiness'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const env = getEnv()
    bootstrapProviders()
    const providerHealth = await healthCheckAll()
    const autonomy = assessAutonomyReadiness()

    return NextResponse.json({
      ok: true,
      service: 'ai-merch-factory',
      humanApproval: env.HUMAN_APPROVAL,
      autoPublish: env.AUTO_PUBLISH,
      mongoConfigured: isMongoConfigured(),
      missingIntegrations: missingOptionalIntegrations(env),
      providers: listProviders().map((p) => p.kind),
      providerHealth,
      autonomy,
    })
  } catch (error) {
    logger.error('healthcheck_failed', { error: error instanceof Error ? error.message : String(error) })
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
