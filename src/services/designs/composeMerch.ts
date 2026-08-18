import sharp from 'sharp'
import type { Niche } from '@/types'

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Split slogan into 1–3 short print lines. */
export function splitSloganLines(slogan: string): string[] {
  const trimmed = slogan.trim()
  const bySentence = trimmed.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean)
  if (bySentence.length >= 2) return bySentence.slice(0, 3)
  const words = trimmed.split(/\s+/).filter(Boolean)
  if (words.length <= 4) return [trimmed]
  if (words.length <= 8) {
    const mid = Math.ceil(words.length / 2)
    return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
  }
  const a = Math.ceil(words.length / 3)
  const b = Math.ceil((2 * words.length) / 3)
  return [words.slice(0, a).join(' '), words.slice(a, b).join(' '), words.slice(b).join(' ')]
}

const ACCENT: Record<Niche, string> = {
  gaming: '#5eead4',
  baseball: '#86efac',
  softball: '#f0abfc',
  pets: '#fb923c',
  teacher: '#fbbf24',
  nurse: '#22d3ee',
  humor: '#f472b6',
  retro: '#c084fc',
  bookish: '#f59e0b',
}

/**
 * Overlay perfect (spelled) slogan typography onto an AI illustration.
 * Starter pack requirement: original artwork + clean typography — not text-only posters.
 */
export async function composeGraphicWithSlogan(input: {
  artBytes: Buffer
  slogan: string
  niche: Niche
  size?: number
}): Promise<{ bytes: Buffer; width: number; height: number; mimeType: 'image/png' }> {
  const size = input.size ?? 2048
  const lines = splitSloganLines(input.slogan).map(escapeXml)
  const accent = ACCENT[input.niche] || ACCENT.gaming
  const bandTop = Math.round(size * 0.72)
  const bandHeight = size - bandTop
  const lineCount = Math.max(1, lines.length)
  const fontSize = lineCount >= 3 ? Math.round(size * 0.042) : lineCount === 2 ? Math.round(size * 0.05) : Math.round(size * 0.058)
  const lineGap = Math.round(fontSize * 1.25)
  const blockHeight = lineGap * lineCount
  const startY = bandTop + Math.round((bandHeight - blockHeight) / 2) + fontSize

  const textNodes = lines
    .map((line, i) => {
      const y = startY + i * lineGap
      return `<text x="${size / 2}" y="${y}" text-anchor="middle" font-family="Arial Black, Impact, Haettenschweiler, sans-serif" font-size="${fontSize}" font-weight="900" fill="#f8fafc" stroke="#0b1220" stroke-width="${Math.max(2, Math.round(fontSize * 0.06))}" paint-order="stroke fill">${line}</text>`
    })
    .join('')

  const overlaySvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="band" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0b1220" stop-opacity="0"/>
      <stop offset="35%" stop-color="#0b1220" stop-opacity="0.72"/>
      <stop offset="100%" stop-color="#0b1220" stop-opacity="0.92"/>
    </linearGradient>
  </defs>
  <rect x="0" y="${bandTop - Math.round(size * 0.04)}" width="${size}" height="${bandHeight + Math.round(size * 0.04)}" fill="url(#band)"/>
  <rect x="${Math.round(size * 0.12)}" y="${bandTop + Math.round(bandHeight * 0.12)}" width="${Math.round(size * 0.76)}" height="${Math.max(4, Math.round(size * 0.004))}" rx="2" fill="${accent}" opacity="0.85"/>
  ${textNodes}
</svg>`
  )

  const base = await sharp(input.artBytes)
    .rotate()
    .resize(size, size, { fit: 'cover', position: 'centre' })
    .ensureAlpha()
    .png()
    .toBuffer()

  const bytes = await sharp(base)
    .composite([{ input: overlaySvg, top: 0, left: 0 }])
    .png()
    .toBuffer()

  return { bytes, width: size, height: size, mimeType: 'image/png' }
}
