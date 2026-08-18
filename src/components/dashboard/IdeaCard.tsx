import Link from 'next/link'
import { artworkUrl, type DemoIdea, getDemoDesign } from '@/lib/demoCatalog'

export function IdeaCard({ idea }: { idea: DemoIdea }) {
  const design = idea.designId ? getDemoDesign(idea.designId) : undefined

  return (
    <article className="overflow-hidden rounded-md border border-line bg-panel/80">
      <div className="relative aspect-[4/3] bg-ink">
        {design ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={artworkUrl(design.id)}
            alt={`Idea artwork: ${idea.slogan}`}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <div>
              <p className="font-display text-lg font-bold text-danger">No artwork</p>
              <p className="mt-2 text-sm text-muted">
                {idea.safetyDecision === 'REJECT'
                  ? 'Blocked by safety — design not generated.'
                  : 'Waiting for design engine.'}
              </p>
            </div>
          </div>
        )}
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs uppercase tracking-[0.16em] text-accent-2">{idea.niche}</p>
          <span
            className={`rounded px-2 py-0.5 text-[11px] font-medium ${
              idea.safetyDecision === 'REJECT'
                ? 'bg-danger/20 text-danger'
                : 'bg-ok/15 text-ok'
            }`}
          >
            {idea.safetyDecision}
          </span>
        </div>
        <h2 className="font-display text-lg font-bold text-text">{idea.slogan}</h2>
        <p className="text-sm text-muted">{idea.concept}</p>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-muted">
          <span>
            Trend <strong className="text-accent">{idea.trendScore}</strong> · {idea.status}
          </span>
          {design ? (
            <Link href="/dashboard/designs" className="text-accent hover:underline">
              View design & mockup
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  )
}
