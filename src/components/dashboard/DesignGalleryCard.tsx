'use client'

import { useEffect, useState, useTransition } from 'react'
import type { DemoDesign } from '@/lib/demoCatalog'
import type { LiveDesignCard } from '@/services/pipeline/dashboard'
import { AuthImage } from '@/components/dashboard/AuthImage'

type CardDesign = DemoDesign | LiveDesignCard

function isLive(design: CardDesign): design is LiveDesignCard {
  return 'source' in design
}

export function DesignGalleryCard({ design }: { design: CardDesign }) {
  const live = isLive(design) ? design : null
  const isPlaceholder = Boolean(live?.isPlaceholder)
  const initialArt =
    live?.artworkSrc && !live.artworkSrc.includes('design-preview') ? live.artworkSrc : undefined

  const [artSrc, setArtSrc] = useState<string | undefined>(() => initialArt)
  const [fromCache, setFromCache] = useState(false)
  const [isAi, setIsAi] = useState(() => Boolean(initialArt?.includes('/api/design-assets/')))
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [autoTried, setAutoTried] = useState(false)

  useEffect(() => {
    const next =
      live?.artworkSrc && !live.artworkSrc.includes('design-preview') ? live.artworkSrc : undefined
    setArtSrc(next)
    setIsAi(Boolean(next?.includes('/api/design-assets/')))
    setFromCache(false)
    setError(null)
    setAutoTried(false)
  }, [design, live])

  function generateAi(force = false) {
    setError(null)
    startTransition(async () => {
      const shouldForce = force || isPlaceholder || !artSrc
      const res = await fetch('/api/designs/generate', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slogan: design.slogan,
          niche: design.niche,
          concept:
            (live?.concept && live.concept.trim()) ||
            `Visual: maximalist original ${design.niche} cartoon hero locked into flashy bubble/varsity lettering — inseparable art+text, neon accents, heavy drop shadows, chest-filling commercial merch graphic.`,
          ideaId: live?.ideaIdMongo || live?.ideaId || undefined,
          force: shouldForce,
        }),
      })
      const data = (await res.json()) as {
        ok?: boolean
        previewUrl?: string
        fromCache?: boolean
        error?: string
        message?: string
        details?: { googleMessage?: string; model?: string; status?: number }
      }
      if (!res.ok || !data.ok || !data.previewUrl) {
        const googleHint = data.details?.googleMessage
        const modelHint = data.details?.model ? ` (model ${data.details.model})` : ''
        setError(
          googleHint
            ? `${data.message || data.error || 'Generation failed'}${modelHint}`
            : data.message || data.error || 'Generation failed'
        )
        return
      }

      try {
        const imgRes = await fetch(data.previewUrl, { credentials: 'same-origin', cache: 'no-store' })
        if (!imgRes.ok) throw new Error(`Asset ${imgRes.status}`)
        const blob = await imgRes.blob()
        if (blob.type.includes('svg')) {
          setError('Generator returned SVG placeholder — check IMAGE_API_KEY / Gemini image model')
          return
        }
        const objectUrl = URL.createObjectURL(blob)
        setArtSrc(objectUrl)
        setIsAi(true)
        setFromCache(Boolean(data.fromCache))
      } catch {
        if (data.previewUrl.includes('design-preview')) {
          setError('Got design-preview SVG instead of Gemini art — image provider misconfigured')
          return
        }
        setArtSrc(data.previewUrl)
        setIsAi(true)
        setFromCache(Boolean(data.fromCache))
      }
    })
  }

  // Auto-kick Gemini for placeholders so bland SVG never sits as the "design"
  useEffect(() => {
    if (!live || !isPlaceholder || autoTried || pending || artSrc) return
    setAutoTried(true)
    generateAi(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, isPlaceholder, autoTried, pending, artSrc])

  return (
    <article className="overflow-hidden rounded-md border border-line bg-panel/80">
      <div className="grid gap-0 sm:grid-cols-2">
        <div className="relative aspect-square bg-ink">
          {artSrc ? (
            <AuthImage
              src={artSrc}
              alt={`Artwork: ${design.slogan}`}
              className="absolute inset-0 h-full w-full object-cover"
              onLoadError={(status) => {
                if (artSrc.includes('/api/design-assets/')) {
                  setError(
                    status === 404
                      ? 'AI image missing from storage — click Force new'
                      : status === 401
                        ? 'Session expired — refresh and sign in again'
                        : 'AI image failed to load — try Force new'
                  )
                  setIsAi(false)
                  setArtSrc(undefined)
                }
              }}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
              <p className="font-display text-lg text-accent">Waiting for Gemini flash art</p>
              <p className="text-sm text-muted">
                No SVG placeholders. Commercial illustrated merch only — art + typography locked
                together.
              </p>
            </div>
          )}
          <span className="absolute left-3 top-3 rounded bg-ink/80 px-2 py-1 text-[11px] uppercase tracking-[0.14em] text-accent">
            {pending
              ? 'Generating…'
              : isAi
                ? fromCache
                  ? 'Cached AI art'
                  : 'AI artwork'
                : 'Needs Gemini'}
          </span>
        </div>
        <div className="relative aspect-square bg-ink-2">
          {artSrc ? (
            <AuthImage
              src={artSrc}
              alt={`Listing preview: ${design.title}`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-muted">
              Listing preview appears after Gemini generates the print.
            </div>
          )}
          <span className="absolute left-3 top-3 rounded bg-ink/80 px-2 py-1 text-[11px] uppercase tracking-[0.14em] text-accent-2">
            Print preview
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
          {live?.source === 'mongo' ? ' · Mongo' : ''}
        </p>
        {isPlaceholder || !artSrc ? (
          <p className="text-sm text-warn">
            Bland SVG circle/text is banned. Generate a flashy commercial graphic (character +
            integrated typography).
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            disabled={pending}
            onClick={() => generateAi(true)}
            className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-ink disabled:opacity-50"
          >
            {pending ? 'Generating flash design…' : 'Generate flash Gemini design'}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => generateAi(true)}
            className="rounded-md border border-line px-3 py-2 text-sm text-text disabled:opacity-50"
          >
            Force new (costs API)
          </button>
          <span className="text-xs text-muted">
            Quality <strong className="text-text">{design.qualityScore}</strong> · IP{' '}
            <strong className="text-text">{design.ipRisk}</strong>
            {fromCache ? ' · Mongo cache hit' : ''}
          </span>
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </div>
    </article>
  )
}
