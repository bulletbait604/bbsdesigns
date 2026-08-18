'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Loads private /api/design-assets/* via fetch+blob so session cookies apply
 * and cold-start 404s surface as onError (plain <img> often just "fails to load").
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
            if (fallbackSrc) setResolved(fallbackSrc)
          }
          return
        }
        const blob = await res.blob()
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        setBlobUrl(objectUrl)
      } catch {
        if (!cancelled) {
          onErrorRef.current?.(null)
          if (fallbackSrc) setResolved(fallbackSrc)
        }
      }
    })()

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [src, fallbackSrc])

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={blobUrl || resolved}
      alt={alt}
      className={className}
      onError={() => {
        if (fallbackSrc && resolved !== fallbackSrc) {
          setResolved(fallbackSrc)
          onErrorRef.current?.(null)
        }
      }}
    />
  )
}
