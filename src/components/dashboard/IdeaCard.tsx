import Link from 'next/link'
import type { DemoIdea } from '@/lib/demoCatalog'
import type { LiveIdeaCard } from '@/services/pipeline/dashboard'
import { AuthImage } from '@/components/dashboard/AuthImage'

export function IdeaCard({ idea }: { idea: DemoIdea | LiveIdeaCard }) {
  const live = idea as LiveIdeaCard
  const preview =
    live.artworkUrl &&
    !live.artworkUrl.includes('design-preview') &&
    !live.artworkUrl.startsWith('data:image/svg')
      ? live.artworkUrl
      : null

  return (
    <article className="overflow-hidden rounded-md border border-line bg-panel/80">
      <div className="relative aspect-[4/3] bg-ink">
        {preview ? (
          <AuthImage
            src={preview}
            alt={`Idea artwork: ${idea.slogan}`}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <div>
              <p className="font-display text-lg font-bold text-accent">
                {idea.safetyDecision === 'REJECT' ? 'No artwork' : 'Awaiting Gemini design'}
              </p>
              <p className="mt-2 text-sm text-muted">
                {idea.safetyDecision === 'REJECT'
                  ? 'Blocked by safety — design not generated.'
                  : 'Bland SVG placeholders are disabled. Open Designs to generate flash AI art.'}
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
              idea.safetyDecision === 'REJECT' ? 'bg-danger/20 text-danger' : 'bg-ok/15 text-ok'
            }`}
          >
            {idea.safetyDecision}
          </span>
        </div>
        <h2 className="font-display text-lg font-bold text-text">{idea.slogan}</h2>
        <p className="text-sm text-muted line-clamp-3">{idea.concept}</p>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-muted">
          <span>
            Trend <strong className="text-accent">{idea.trendScore}</strong> · {idea.status}
          </span>
          <Link href="/dashboard/designs" className="text-accent hover:underline">
            Generate / view design
          </Link>
        </div>
      </div>
    </article>
  )
}
