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
      subtitle="Run now always executes a fresh job. Pause is respected and persisted to Mongo. Publishing stays gated while AUTO_PUBLISH=false."
    >
      <AutomationConsole jobs={AUTOMATION_JOBS} initialStates={states} initialRuns={runs} />
    </DashboardShell>
  )
}
