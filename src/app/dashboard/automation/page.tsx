import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { AutomationConsole } from '@/components/dashboard/AutomationConsole'
import { AUTOMATION_JOBS, listJobStates, listRuns } from '@/services/automation'

export default function AutomationPage() {
  const states = listJobStates()
  const runs = listRuns()

  return (
    <DashboardShell
      activePath="/dashboard/automation"
      title="Automation"
      subtitle="Scheduled pipeline jobs — unique IDs, idempotent, logged, retryable. Publishing stays gated by HUMAN_APPROVAL."
    >
      <AutomationConsole jobs={AUTOMATION_JOBS} initialStates={states} initialRuns={runs} />
    </DashboardShell>
  )
}
