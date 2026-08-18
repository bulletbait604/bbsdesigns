import type { DemoDesign } from '@/lib/demoCatalog'
import type { Niche } from '@/types'

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function splitSlogan(slogan: string): string[] {
  const parts = slogan.split(/(?<=\.)\s+|\n/).map((s) => s.trim()).filter(Boolean)
  if (parts.length >= 2) return parts.slice(0, 3)
  const words = slogan.split(/\s+/)
  if (words.length <= 3) return [slogan]
  const mid = Math.ceil(words.length / 2)
  return [words.slice(0, mid).join(' '), words.slice(mid).join(' ')]
}

const NICHE_PALETTE: Record<
  Niche,
  { bg: string; ink: string; accent: string; shirt: string }
> = {
  gaming: { bg: '#0b1220', ink: '#f4f7fb', accent: '#5eead4', shirt: '#1e293b' },
  baseball: { bg: '#102018', ink: '#f8fafc', accent: '#86efac', shirt: '#14532d' },
  softball: { bg: '#1a1420', ink: '#fdf4ff', accent: '#f0abfc', shirt: '#3b0764' },
  pets: { bg: '#1a1208', ink: '#fff7ed', accent: '#fb923c', shirt: '#7c2d12' },
  teacher: { bg: '#0f172a', ink: '#f8fafc', accent: '#fbbf24', shirt: '#1e3a5f' },
  nurse: { bg: '#0c1929', ink: '#ecfeff', accent: '#22d3ee', shirt: '#164e63' },
  humor: { bg: '#1a0b16', ink: '#fdf4ff', accent: '#f472b6', shirt: '#4a044e' },
  retro: { bg: '#150b1f', ink: '#faf5ff', accent: '#c084fc', shirt: '#3b0764' },
  bookish: { bg: '#1c1408', ink: '#fffbeb', accent: '#f59e0b', shirt: '#78350f' },
}

/** Simple niche illustration motif so SVG placeholders are not word-only. */
function nicheMotifSvg(niche: Niche, accent: string): string {
  if (niche === 'gaming') {
    return `
  <rect x="312" y="280" width="400" height="220" rx="48" fill="${accent}" opacity="0.85"/>
  <circle cx="390" cy="390" r="28" fill="#0b1220"/>
  <circle cx="634" cy="360" r="18" fill="#0b1220"/>
  <circle cx="680" cy="400" r="18" fill="#0b1220"/>
  <rect x="470" y="350" width="18" height="70" rx="6" fill="#0b1220"/>
  <rect x="444" y="376" width="70" height="18" rx="6" fill="#0b1220"/>`
  }
  if (niche === 'baseball') {
    return `
  <circle cx="512" cy="360" r="120" fill="#f8fafc" opacity="0.92"/>
  <path d="M420 300 Q512 360 604 300" fill="none" stroke="${accent}" stroke-width="8"/>
  <path d="M420 420 Q512 360 604 420" fill="none" stroke="${accent}" stroke-width="8"/>
  <rect x="250" y="470" width="220" height="18" rx="8" fill="${accent}" transform="rotate(-35 360 479)"/>`
  }
  if (niche === 'softball') {
    return `
  <circle cx="512" cy="350" r="110" fill="#fdf4ff" opacity="0.92"/>
  <path d="M430 300 Q512 350 594 300" fill="none" stroke="${accent}" stroke-width="7"/>
  <path d="M430 400 Q512 350 594 400" fill="none" stroke="${accent}" stroke-width="7"/>
  <ellipse cx="512" cy="500" rx="140" ry="28" fill="${accent}" opacity="0.35"/>`
  }
  // Default flashy badge for lifestyle niches
  return `
  <circle cx="512" cy="360" r="130" fill="${accent}" opacity="0.85"/>
  <circle cx="512" cy="360" r="78" fill="#0b1220" opacity="0.55"/>
  <path d="M512 250 L540 330 L625 330 L555 380 L580 460 L512 410 L444 460 L469 380 L399 330 L484 330 Z" fill="#f8fafc" opacity="0.9"/>`
}

/** Build a DemoDesign-shaped object for live SVG previews (non-catalog). */
export function buildLiveMerchDesign(input: {
  slogan: string
  niche: Niche
  title?: string
}): DemoDesign {
  return {
    id: 'lag-lifestyle',
    ideaId: 'live',
    niche: input.niche,
    title: input.title || input.slogan,
    slogan: input.slogan,
    style: 'Live SVG preview',
    mockupLabel: 'Black tee · front print',
    qualityScore: 70,
    ipRisk: 5,
    safetyDecision: 'PASS',
    status: 'review',
    palette: NICHE_PALETTE[input.niche],
  }
}

/** Print-ready artwork SVG for dashboard preview (illustration + secondary text). */
export function buildArtworkSvg(design: DemoDesign): string {
  const lines = splitSlogan(design.slogan).map(escapeXml)
  const { bg, ink, accent } = design.palette
  const lineHeight = 56
  const startY = 720 - ((lines.length - 1) * lineHeight) / 2

  const textNodes = lines
    .map(
      (line, i) =>
        `<text x="512" y="${startY + i * lineHeight}" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-size="${lines.length > 2 ? 36 : 44}" font-weight="800" fill="${ink}">${line}</text>`
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <rect width="1024" height="1024" fill="${bg}"/>
  <circle cx="180" cy="160" r="120" fill="${accent}" opacity="0.12"/>
  <circle cx="860" cy="880" r="160" fill="${accent}" opacity="0.1"/>
  <rect x="120" y="120" width="784" height="784" rx="28" fill="none" stroke="${accent}" stroke-width="4" opacity="0.35"/>
  <text x="512" y="190" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" letter-spacing="6" fill="${accent}" opacity="0.9">${escapeXml(design.niche.toUpperCase())} · PLACEHOLDER</text>
  ${nicheMotifSvg(design.niche, accent)}
  ${textNodes}
  <text x="512" y="900" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="${ink}" opacity="0.5">Generate AI design for real illustrated artwork</text>
</svg>`
}

/** Apparel mockup SVG with artwork placed on a tee silhouette. */
export function buildMockupSvg(design: DemoDesign): string {
  const lines = splitSlogan(design.slogan).map(escapeXml)
  const { accent, shirt, ink } = design.palette
  const lineHeight = 28
  const startY = 470 - ((lines.length - 1) * lineHeight) / 2

  const printText = lines
    .map(
      (line, i) =>
        `<text x="400" y="${startY + i * lineHeight}" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-size="${lines.length > 2 ? 16 : 20}" font-weight="800" fill="${ink}">${line}</text>`
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="800" height="900" viewBox="0 0 800 900">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#07111f"/>
      <stop offset="100%" stop-color="#10233b"/>
    </linearGradient>
  </defs>
  <rect width="800" height="900" fill="url(#bg)"/>
  <path d="M250 180 L170 250 L220 300 L250 280 L250 780 Q250 820 300 820 L500 820 Q550 820 550 780 L550 280 L580 300 L630 250 L550 180 Q500 150 400 150 Q300 150 250 180 Z"
        fill="${shirt}" stroke="${accent}" stroke-width="3" opacity="0.95"/>
  <ellipse cx="400" cy="190" rx="48" ry="28" fill="#07111f" opacity="0.55"/>
  <rect x="290" y="320" width="220" height="240" rx="12" fill="#07111f" opacity="0.35"/>
  <circle cx="400" cy="390" r="48" fill="${accent}" opacity="0.75"/>
  ${printText}
  <text x="400" y="860" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="${accent}">${escapeXml(design.mockupLabel)}</text>
</svg>`
}

/** Data URI for reliable <img> rendering without hitting the API. */
export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

export function artworkDataUri(design: DemoDesign): string {
  return svgToDataUri(buildArtworkSvg(design))
}

export function mockupDataUri(design: DemoDesign): string {
  return svgToDataUri(buildMockupSvg(design))
}
