import { artworkUrl, mockupUrl, type DemoDesign } from '@/lib/demoCatalog'

export function DesignGalleryCard({ design }: { design: DemoDesign }) {
  return (
    <article className="overflow-hidden rounded-md border border-line bg-panel/80">
      <div className="grid gap-0 sm:grid-cols-2">
        <div className="relative aspect-square bg-ink">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={artworkUrl(design.id)}
            alt={`Artwork: ${design.slogan}`}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <span className="absolute left-3 top-3 rounded bg-ink/80 px-2 py-1 text-[11px] uppercase tracking-[0.14em] text-accent">
            Artwork
          </span>
        </div>
        <div className="relative aspect-square bg-ink-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mockupUrl(design.id)}
            alt={`Mockup: ${design.title}`}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <span className="absolute left-3 top-3 rounded bg-ink/80 px-2 py-1 text-[11px] uppercase tracking-[0.14em] text-accent-2">
            Mockup
          </span>
        </div>
      </div>
      <div className="space-y-2 p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-accent-2">{design.niche}</p>
            <h2 className="font-display mt-1 text-xl font-bold text-text">{design.title}</h2>
            <p className="mt-1 text-sm text-muted">{design.slogan}</p>
          </div>
          <span
            className={`rounded px-2 py-1 text-xs font-medium ${
              design.safetyDecision === 'REJECT'
                ? 'bg-danger/20 text-danger'
                : design.safetyDecision === 'REVIEW'
                  ? 'bg-warn/20 text-warn'
                  : 'bg-ok/15 text-ok'
            }`}
          >
            {design.safetyDecision}
          </span>
        </div>
        <p className="text-sm text-muted">
          {design.style} · {design.mockupLabel}
        </p>
        <div className="flex flex-wrap gap-4 pt-1 text-xs text-muted">
          <span>
            Quality <strong className="text-text">{design.qualityScore}</strong>
          </span>
          <span>
            IP risk <strong className="text-text">{design.ipRisk}</strong>
          </span>
          <span>
            Status <strong className="text-text">{design.status}</strong>
          </span>
        </div>
      </div>
    </article>
  )
}
