'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import type { DemoDesign } from '@/lib/demoCatalog'
import { artworkDataUri, mockupDataUri } from '@/lib/svgMerch'
import type { LiveDesignCard } from '@/services/pipeline/dashboard'

type CardDesign = DemoDesign | LiveDesignCard

function isLive(design: CardDesign): design is LiveDesignCard {
  return 'source' in design
}

export function DesignGalleryCard({ design }: { design: CardDesign }) {
  const live = isLive(design) ? design : null
  const isPlaceholder = Boolean(live?.isPlaceholder)
  const fallbackArt = useMemo(() => artworkDataUri(design), [design])
  const fallbackMock = useMemo(() => mockupDataUri(design), [design])

  const [artSrc, setArtSrc] = useState(
    () => (live && live.artworkSrc) || fallbackArt
  )
  const [mockSrc, setMockSrc] = useState(
    () => (live && live.mockupSrc) || fallbackMock
  )
  const [fromCache, setFromCache] = useState(false)
  const [isAi, setIsAi] = useState(() => Boolean(live && !live.isPlaceholder && live.artworkSrc?.includes('/api/design-assets/')))
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    setArtSrc((live && live.artworkSrc) || fallbackArt)
    setMockSrc((live && live.mockupSrc) || fallbackMock)
    setIsAi(Boolean(live && !live.isPlaceholder && live.artworkSrc?.includes('/api/design-assets/')))
    setFromCache(false)
  }, [design, fallbackArt, fallbackMock, live])

  function generateAi(force = false) {
    setError(null)
    startTransition(async () => {
      const shouldForce = force || isPlaceholder
      const res = await fetch('/api/designs/generate', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slogan: design.slogan,
          niche: design.niche,
          concept:
            (live?.concept && live.concept.trim()) ||
            `Visual: bold original ${design.niche} cartoon hero object with attitude, thick outlines, streetwear POD print. Secondary lettering only for the slogan.`,
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
        const imgRes = await fetch(data.previewUrl, { credentials: 'same-origin' })
        if (!imgRes.ok) throw new Error(`Asset ${imgRes.status}`)
        const blob = await imgRes.blob()
        const objectUrl = URL.createObjectURL(blob)
        setArtSrc(objectUrl)
        setIsAi(true)
        setFromCache(Boolean(data.fromCache))
      } catch {
        setArtSrc(data.previewUrl)
        setIsAi(true)
        setFromCache(Boolean(data.fromCache))
      }
    })
  }

  return (
    <article className="overflow-hidden rounded-md border border-line bg-panel/80">
      <div className="grid gap-0 sm:grid-cols-2">
        <div className="relative aspect-square bg-ink">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={artSrc}
            alt={`Artwork: ${design.slogan}`}
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => {
              if (artSrc.includes('/api/design-assets/')) {
                setError('AI image failed to load — try Force new')
                return
              }
              setArtSrc(fallbackArt)
            }}
          />
          <span className="absolute left-3 top-3 rounded bg-ink/80 px-2 py-1 text-[11px] uppercase tracking-[0.14em] text-accent">
            {isAi
              ? fromCache
                ? 'Cached AI art'
                : 'AI artwork'
              : isPlaceholder
                ? 'SVG placeholder'
                : 'Artwork'}
          </span>
        </div>
        <div className="relative aspect-square bg-ink-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={mockSrc}
            alt={`Mockup: ${design.title}`}
            className="absolute inset-0 h-full w-full object-cover"
            onError={() => setMockSrc(fallbackMock)}
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
          {live?.source === 'mongo' ? ' · Mongo' : ''}
        </p>
        {isPlaceholder ? (
          <p className="text-sm text-warn">
            SVG placeholder only. Generate a flashy viral tee: cartoon imagery locked together with
            the slogan lettering (not text-only).
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            disabled={pending}
            onClick={() => generateAi(isPlaceholder)}
            className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-ink disabled:opacity-50"
          >
            {pending
              ? 'Generating flash design…'
              : isPlaceholder
                ? 'Generate flash design (art + text)'
                : isAi
                  ? 'Load cached / generate'
                  : 'Generate flash design (art + text)'}
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
