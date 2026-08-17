import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { ApprovalCard } from '@/components/dashboard/ApprovalCard'
import { DEMO_APPROVALS } from '@/lib/dashboardData'

export default function SafetyQueuePage() {
  return (
    <DashboardShell
      activePath="/dashboard/safety"
      title="Safety Queue"
      subtitle="Approve only what PASSes safety. REJECT always wins — high trend scores cannot override."
    >
      <div className="space-y-5">
        {DEMO_APPROVALS.map((item) => (
          <ApprovalCard key={item.id} item={item} />
        ))}
      </div>
    </DashboardShell>
  )
}
