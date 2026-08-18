import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { IdeaCard } from '@/components/dashboard/IdeaCard'
import { DEMO_IDEAS } from '@/lib/demoCatalog'

export default function IdeasPage() {
  return (
    <DashboardShell
      activePath="/dashboard/ideas"
      title="Ideas"
      subtitle="Slogan concepts with linked artwork when safety allows a design to be generated."
    >
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {DEMO_IDEAS.map((idea) => (
          <IdeaCard key={idea.id} idea={idea} />
        ))}
      </div>
    </DashboardShell>
  )
}
