'use client'

import { useState, useTransition } from 'react'
import { artworkUrl, mockupUrl, type DemoDesign } from '@/lib/demoCatalog'

export function DesignGalleryCard({ design }: { design: DemoDesign }) {
  const [aiPreview, setAiPreview] = useState<string | null>(null)
  const [fromCache, setFromCache] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function generateAi(force = false) {
    setError(null)
    startTransition(async () => {
      const res = await fetch('/api/designs/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slogan: design.slogan,
          niche: design.niche,
          concept: `${design.style}. Trendy flashy high-pop merch illustration.`,
          force,
        }),
      })
      const data = (await res.json()) as {
        ok?: boolean
        previewUrl?: string
        fromCache?: boolean
        error?: string
        message?: string
      }
      if (!res.ok || !data.ok || !data.previewUrl) {
        setError(data.message || data.error || 'Generation failed')
        return
      }
      setFromCache(Boolean(data.fromCache))
      setAiPreview(data.previewUrl)
    })
  }

  return (
    <article className="overflow-hidden rounded-md border border-line bg-panel/80">
      <div className="grid gap-0 sm:grid-cols-2">
        <div className="relative aspect-square bg-ink">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={aiPreview || artworkUrl(design.id)}
            alt={`Artwork: ${design.slogan}`}
            className="absolute inset-0 h-full w-full object-cover"
          />
          <span className="absolute left-3 top-3 rounded bg-ink/80 px-2 py-1 text-[11px] uppercase tracking-[0.14em] text-accent">
            {aiPreview ? (fromCache ? 'Cached AI art' : 'AI artwork') : 'Artwork'}
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
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            disabled={pending}
            onClick={() => generateAi(false)}
            className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-ink disabled:opacity-50"
          >
            {pending ? 'Working…' : aiPreview ? 'Load cached / generate' : 'Generate AI design (Google)'}
          </button>
          {aiPreview ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => generateAi(true)}
              className="rounded-md border border-line px-3 py-2 text-sm text-text disabled:opacity-50"
            >
              Force new (costs API)
            </button>
          ) : null}
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
