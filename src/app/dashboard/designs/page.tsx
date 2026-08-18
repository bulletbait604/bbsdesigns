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
          ? 'Each design is one flashy viral tee graphic: cartoon imagery locked together with slogan lettering (not text-only, not boring stickers).'
          : 'Catalog previews (SVG placeholders). Connect Mongo + Gemini, then run design_generation for real AI designs.'
      }
    >
      {!designs.length ? (
        <p className="text-sm text-muted">
          {source === 'mongo'
            ? 'No designs yet. Approve ideas and run Automation → design_generation, or generate from this page.'
            : 'No demo designs available.'}
        </p>
      ) : (
        <div className="space-y-6">
          {designs.map((design) => (
            <DesignGalleryCard key={design.mongoId || `${design.id}-${design.slogan}`} design={design} />
          ))}
        </div>
      )}
    </DashboardShell>
  )
}
