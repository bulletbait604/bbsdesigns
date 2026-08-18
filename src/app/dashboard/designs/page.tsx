import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { DesignGalleryCard } from '@/components/dashboard/DesignGalleryCard'
import { DEMO_DESIGNS } from '@/lib/demoCatalog'

export default function DesignsPage() {
  return (
    <DashboardShell
      activePath="/dashboard/designs"
      title="Designs"
      subtitle="Artwork and apparel mockups for each concept. Previews render live from the design catalog."
    >
      <div className="space-y-6">
        {DEMO_DESIGNS.map((design) => (
          <DesignGalleryCard key={design.id} design={design} />
        ))}
      </div>
    </DashboardShell>
  )
}
