import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { IdeaCard } from '@/components/dashboard/IdeaCard'
import { loadIdeasForDashboard } from '@/services/pipeline/dashboard'

export const dynamic = 'force-dynamic'

export default async function IdeasPage() {
  const { ideas, source } = await loadIdeasForDashboard()

  return (
    <DashboardShell
      activePath="/dashboard/ideas"
      title="Ideas"
      subtitle={
        source === 'mongo'
          ? 'Live slogan concepts from Mongo (automation idea_generation).'
          : 'Demo catalog — run Automation → Idea generation after Mongo is connected.'
      }
    >
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {ideas.map((idea) => (
          <IdeaCard key={idea.id} idea={idea} />
        ))}
      </div>
    </DashboardShell>
  )
}
