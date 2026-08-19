'use client'

import { useEffect, useRef, useState } from 'react'

function isSvgLike(url?: string): boolean {
  if (!url) return false
  return (
    url.includes('design-preview') ||
    url.startsWith('data:image/svg') ||
    url.includes('image/svg+xml')
  )
}

/**
 * Loads private /api/design-assets/* via fetch+blob so session cookies apply
 * and cold-start 404s surface as onError (plain <img> often just "fails to load").
 * Never falls back to bland SVG placeholders.
 */
export function AuthImage(props: {
  src: string
  alt: string
  className?: string
  fallbackSrc?: string
  onLoadError?: (status: number | null) => void
}) {
  const { src, alt, className, fallbackSrc, onLoadError } = props
  const onErrorRef = useRef(onLoadError)
  onErrorRef.current = onLoadError

  const safeFallback = isSvgLike(fallbackSrc) ? undefined : fallbackSrc
  const [resolved, setResolved] = useState(src)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let objectUrl: string | null = null

    setBlobUrl(null)
    setResolved(src)

    const needsAuthFetch = src.startsWith('/api/design-assets/')
    if (!needsAuthFetch) return () => undefined

    ;(async () => {
      try {
        const res = await fetch(src, { credentials: 'same-origin', cache: 'no-store' })
        if (!res.ok) {
          if (!cancelled) {
            onErrorRef.current?.(res.status)
            if (safeFallback) setResolved(safeFallback)
          }
          return
        }
        const blob = await res.blob()
        if (cancelled) return
        if (blob.type.includes('svg')) {
          onErrorRef.current?.(res.status)
          return
        }
        objectUrl = URL.createObjectURL(blob)
        setBlobUrl(objectUrl)
      } catch {
        if (!cancelled) {
          onErrorRef.current?.(null)
          if (safeFallback) setResolved(safeFallback)
        }
      }
    })()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src, safeFallback])

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={blobUrl || resolved}
      alt={alt}
      className={className}
      onError={() => {
        if (safeFallback && resolved !== safeFallback) {
          setResolved(safeFallback)
          onErrorRef.current?.(null)
        } else {
          onErrorRef.current?.(null)
        }
      }}
    />
  )
}
