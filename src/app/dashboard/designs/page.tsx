import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { DesignGalleryCard } from '@/components/dashboard/DesignGalleryCard'
import { loadDesignsForDashboard } from '@/services/pipeline/dashboard'

export const dynamic = 'force-dynamic'

export default async function DesignsPage() {
  const { designs, source } = await loadDesignsForDashboard()

  return (
    <DashboardShell
      activePath="/dashboard/designs"
      title="Designs"
      subtitle={
        source === 'mongo'
          ? 'Live designs from Mongo — artwork + tee mockups. Generate Google AI art when ready.'
          : 'Catalog previews (SVG). Run Automation → design generation after Mongo is connected for live rows.'
      }
    >
      <div className="space-y-6">
        {designs.map((design) => (
          <DesignGalleryCard key={design.mongoId || design.id + design.slogan} design={design} />
        ))}
      </div>
    </DashboardShell>
  )
}
