'use client'

import { useState, useTransition } from 'react'
import { AuthImage } from '@/components/dashboard/AuthImage'

export function DesignGenerateFromIdea(props: {
  ideaId: string
  slogan: string
  niche: string
  concept: string
}) {
  const { ideaId, slogan, niche, concept } = props
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  function generate() {
    setError(null)
    setPreviewUrl(null)
    startTransition(async () => {
      const res = await fetch('/api/designs/generate', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slogan,
          niche,
          concept:
            concept.trim() ||
            `Visual: maximalist original ${niche} cartoon hero locked into flashy bubble/varsity lettering — inseparable art+text, neon accents, heavy drop shadows, chest-filling commercial merch graphic.`,
          ideaId,
          force: true,
        }),
      })
      const data = (await res.json()) as {
        ok?: boolean
        previewUrl?: string
        message?: string
        error?: string
        details?: { googleMessage?: string; model?: string }
      }
      if (!res.ok || !data.ok || !data.previewUrl) {
        const hint = data.details?.googleMessage
        setError(
          res.status === 503
            ? `${data.message || data.error || 'Gemini not configured'} — set GEMINI_API / IMAGE_API_KEY on Vercel and redeploy.`
            : hint
              ? `${data.message || data.error}: ${hint}`
              : data.message || data.error || 'Generation failed'
        )
        return
      }
      if (data.previewUrl.includes('design-preview') || data.previewUrl.startsWith('data:image/svg')) {
        setError('Got SVG placeholder — Gemini image provider is not working')
        return
      }
      setPreviewUrl(data.previewUrl)
    })
  }

  return (
    <div className="rounded-md border border-line bg-panel/80 p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-accent-2">{niche}</p>
      <p className="mt-1 font-display text-lg font-bold text-text">{slogan}</p>
      {previewUrl ? (
        <div className="relative mt-3 aspect-square overflow-hidden rounded-md bg-ink">
          <AuthImage
            src={previewUrl}
            alt={slogan}
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={generate}
        className="mt-3 rounded-md bg-accent px-3 py-2 text-sm font-medium text-ink disabled:opacity-50"
      >
        {pending ? 'Calling Gemini…' : 'Generate flash Gemini design'}
      </button>
      {error ? (
        <p className="mt-2 rounded-md border border-danger/40 bg-danger/10 p-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
