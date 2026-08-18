import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { AutomationConsole } from '@/components/dashboard/AutomationConsole'
import {
  AUTOMATION_JOBS,
  hydrateAutomationRunsFromMongo,
  listJobStates,
  listRuns,
} from '@/services/automation'

export const dynamic = 'force-dynamic'

export default async function AutomationPage() {
  await hydrateAutomationRunsFromMongo()
  const states = listJobStates()
  const runs = listRuns()

  return (
    <DashboardShell
      activePath="/dashboard/automation"
      title="Automation"
      subtitle="Scheduled pipeline jobs — unique IDs, idempotent, logged, retryable. Runs persist to Mongo when configured."
    >
      <AutomationConsole jobs={AUTOMATION_JOBS} initialStates={states} initialRuns={runs} />
    </DashboardShell>
  )
}
