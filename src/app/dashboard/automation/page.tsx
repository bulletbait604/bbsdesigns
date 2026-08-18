import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { AutomationConsole } from '@/components/dashboard/AutomationConsole'
import {
  AUTOMATION_JOBS,
  assessAutonomyReadiness,
  hydrateAutomationRunsFromMongo,
  listJobStates,
  listRuns,
} from '@/services/automation'

export const dynamic = 'force-dynamic'

export default async function AutomationPage() {
  await hydrateAutomationRunsFromMongo()
  const states = listJobStates()
  const runs = listRuns()
  const autonomy = assessAutonomyReadiness()

  return (
    <DashboardShell
      activePath="/dashboard/automation"
      title="Automation"
      subtitle="Daily Vercel Cron fills text slogans + AI illustrations. Pause is persisted. Publishing stays gated while AUTO_PUBLISH=false."
    >
      <section className="panel" style={{ marginBottom: 16 }}>
        <h2 className="panel-title">Autonomy check</h2>
        <p className="text-muted" style={{ marginBottom: 8 }}>
          Generation ready:{' '}
          <strong className={autonomy.readyForAutonomousGeneration ? 'text-ok' : 'text-warn'}>
            {autonomy.readyForAutonomousGeneration ? 'YES' : 'NO'}
          </strong>
          {' · '}
          Text AI: {autonomy.textDesigns.ready ? 'on' : 'off'} · Image AI:{' '}
          {autonomy.imageDesigns.ready ? `on (≤${autonomy.imageDesigns.maxAiPerRun}/run)` : 'off'} ·
          Auto-publish: never (human approval)
        </p>
        <p className="text-muted" style={{ fontSize: 13 }}>
          Cron: {autonomy.cronConfiguredHint}
        </p>
        {autonomy.blockers.length > 0 ? (
          <ul className="text-warn" style={{ marginTop: 8, paddingLeft: 18 }}>
            {autonomy.blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        ) : null}
      </section>
      <AutomationConsole jobs={AUTOMATION_JOBS} initialStates={states} initialRuns={runs} />
    </DashboardShell>
  )
}
