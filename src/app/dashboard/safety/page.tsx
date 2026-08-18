import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { ApprovalCard } from '@/components/dashboard/ApprovalCard'
import { loadSafetyQueueForDashboard } from '@/services/pipeline/dashboard'

export const dynamic = 'force-dynamic'

export default async function SafetyQueuePage() {
  const { items, source } = await loadSafetyQueueForDashboard()

  return (
    <DashboardShell
      activePath="/dashboard/safety"
      title="Safety Queue"
      subtitle={
        source === 'mongo'
          ? 'Approve only what PASSes safety. REJECT always wins — high trend scores cannot override.'
          : 'Demo queue — connect Mongo and run Automation jobs for live items.'
      }
    >
      <div className="space-y-5">
        {items.map((item) => (
          <ApprovalCard key={item.id} item={item} />
        ))}
      </div>
    </DashboardShell>
  )
}
