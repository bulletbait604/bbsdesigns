import { NextResponse } from 'next/server'
import { getSessionFromCookies } from '@/lib/auth/session'
import {
  formatOverhaulReportMarkdown,
  runOverhaulPipelineDemo,
} from '@/services/pipeline/overhaulDemo'
import { resolveAutomationMode } from '@/services/automation/modes'
import { getFeatureFlags } from '@/lib/featureFlags'
import { listDesignStyles } from '@/services/researchV2/styleLibrary'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: Request) {
  const session = await getSessionFromCookies()
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const run = url.searchParams.get('run') === '1'

  if (!run) {
    return NextResponse.json({
      flags: getFeatureFlags(),
      mode: resolveAutomationMode(),
      styleLibraryCount: listDesignStyles().length,
      hint: 'Add ?run=1 to execute the V2 research→concept→design-review demo on 20 opportunities.',
    })
  }

  const report = await runOverhaulPipelineDemo({
    limit: Number(url.searchParams.get('limit') || 20),
    includeLive: url.searchParams.get('live') === '1',
  })

  if (url.searchParams.get('format') === 'md') {
    return new NextResponse(formatOverhaulReportMarkdown(report), {
      headers: { 'Content-Type': 'text/markdown; charset=utf-8' },
    })
  }

  return NextResponse.json(report)
}
