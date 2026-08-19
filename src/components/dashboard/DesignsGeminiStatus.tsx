import { assessAutonomyReadiness } from '@/services/automation/readiness'
import { Idea } from '@/models/Idea'
import { Design } from '@/models/Design'
import { isMongoConfigured, connectMongo } from '@/lib/db'
import { DesignGenerateFromIdea } from '@/components/dashboard/DesignGenerateFromIdea'

export async function DesignsGeminiStatus() {
  const readiness = assessAutonomyReadiness()
  const image = readiness.imageDesigns

  if (image.ready) {
    return (
      <div className="mb-6 rounded-md border border-ok/30 bg-ok/10 px-4 py-3 text-sm text-ok">
        Gemini image ready ({image.provider}). Generate will create real illustrated prints — not SVG
        placeholders.
      </div>
    )
  }

  return (
    <div className="mb-6 rounded-md border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
      <p className="font-medium">Gemini image is NOT configured — Generate cannot make real art.</p>
      <p className="mt-1 text-danger/90">
        In Vercel → Environment Variables set <code className="text-text">GEMINI_API</code> (or{' '}
        <code className="text-text">IMAGE_API_KEY</code>), set{' '}
        <code className="text-text">IMAGE_PROVIDER=google</code>, redeploy, then hard-refresh this
        page. {image.detail}
      </p>
    </div>
  )
}

/** When the gallery was purged of SVG junk, let admins kick Gemini from approved ideas. */
export async function DesignsEmptyGeneratePanel() {
  if (!isMongoConfigured()) return null
  await connectMongo()

  const ideas = await Idea.find({
    status: { $in: ['approved', 'awaiting_approval'] },
    'provenance.safetyDecision': { $ne: 'REJECT' },
  })
    .sort({ createdAt: -1 })
    .limit(12)
    .lean()

  if (!ideas.length) {
    return (
      <p className="text-sm text-muted">
        No approved ideas yet. Run Automation → idea generation, approve on Safety, then generate
        designs here.
      </p>
    )
  }

  const ideaIds = ideas.map((i) => i._id)
  const designs = await Design.find()
    .where('ideaId')
    .in(ideaIds)
    .select({ ideaId: 1, provider: 1, mimeType: 1, assetUrl: 1 })
    .lean()
  const hasReal = new Set(
    designs
      .filter((d) => {
        const url = d.assetUrl || ''
        return (
          !(d.provider || '').includes('svg') &&
          d.mimeType !== 'image/svg+xml' &&
          !url.includes('design-preview') &&
          Boolean(url)
        )
      })
      .map((d) => String(d.ideaId))
  )

  const pending = ideas.filter((i) => !hasReal.has(String(i._id)))
  if (!pending.length) {
    return (
      <p className="text-sm text-muted">
        All recent ideas already have raster art. Open a card above or Force new to regenerate.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        SVG placeholders were removed. Generate real Gemini art for these ideas:
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {pending.map((idea) => (
          <DesignGenerateFromIdea
            key={String(idea._id)}
            ideaId={String(idea._id)}
            slogan={idea.slogan}
            niche={idea.niche}
            concept={idea.concept || ''}
          />
        ))}
      </div>
    </div>
  )
}
