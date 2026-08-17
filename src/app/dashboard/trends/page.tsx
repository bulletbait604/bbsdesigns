import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { DEMO_TRENDS } from '@/lib/dashboardData'

export default function TrendsPage() {
  return (
    <DashboardShell
      activePath="/dashboard/trends"
      title="Trends"
      subtitle="Normalized signals from curated/permitted sources. Scores estimate opportunity only."
    >
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-panel text-xs uppercase tracking-[0.14em] text-muted">
            <tr>
              <th className="px-4 py-3 font-medium">Niche</th>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Score</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {DEMO_TRENDS.map((trend) => (
              <tr key={trend.title} className="border-t border-line/80">
                <td className="px-4 py-3 text-accent-2">{trend.niche}</td>
                <td className="px-4 py-3">{trend.title}</td>
                <td className="px-4 py-3 font-display text-accent">{trend.score}</td>
                <td className="px-4 py-3 text-muted">{trend.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </DashboardShell>
  )
}
