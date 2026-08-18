/**
 * Design style library — broad creative directions only.
 * Never instructions to imitate a protected brand or artist.
 */
export type DesignStyleId =
  | 'vintage_americana'
  | 'retro_70s'
  | 'neon_80s'
  | 'cartoon_90s'
  | 'retro_arcade'
  | 'comic_book'
  | 'vintage_tattoo'
  | 'hand_drawn_doodle'
  | 'bold_streetwear'
  | 'college_graphic'
  | 'mascot_illustration'
  | 'distressed_screenprint'
  | 'psychedelic'
  | 'western'
  | 'gothic'
  | 'cute_kawaii'
  | 'minimal_premium'
  | 'sticker_bomb'
  | 'sports_poster'
  | 'vintage_baseball_card'
  | 'racing_graphic'
  | 'heavy_metal_original'
  | 'outdoor_adventure'
  | 'camping_badge'
  | 'food_illustration'
  | 'animal_illustration'
  | 'cyberpunk'
  | 'vaporwave'
  | 'y2k'
  | 'luxury_streetwear'

export type DesignStyle = {
  id: DesignStyleId
  label: string
  brief: string
  typography: string
  bestFor: string[]
}

export const DESIGN_STYLE_LIBRARY: DesignStyle[] = [
  {
    id: 'vintage_americana',
    label: 'Vintage Americana',
    brief: 'Worn patriotic-adjacent Americana energy without flags-as-logos; distressed ink, badge shapes.',
    typography: 'arched varsity / weathered slab',
    bestFor: ['baseball', 'softball', 'humor', 'teacher'],
  },
  {
    id: 'neon_80s',
    label: '80s Neon',
    brief: 'Hot neon grids, chrome outlines, night-arcade glow, maximal color clash.',
    typography: 'chrome italic + neon outline',
    bestFor: ['gaming', 'retro', 'humor'],
  },
  {
    id: 'retro_arcade',
    label: 'Retro Arcade',
    brief: 'Pixel-adjacent shapes invented fresh; coin-op cabinet energy, scanlines, joystick mascots.',
    typography: 'blocky arcade + curved secondary',
    bestFor: ['gaming', 'retro'],
  },
  {
    id: 'comic_book',
    label: 'Comic Book',
    brief: 'Halftone dots, action bursts, speed lines, exaggerated expressions, panel punch.',
    typography: 'burst balloons + stacked impact type',
    bestFor: ['humor', 'gaming', 'pets', 'softball'],
  },
  {
    id: 'vintage_tattoo',
    label: 'Vintage Tattoo',
    brief: 'Bold black outlines, roses/stars/ribbons as ORIGINAL marks, sailor-flash composition.',
    typography: 'banner ribbon lettering',
    bestFor: ['pets', 'humor', 'retro'],
  },
  {
    id: 'bold_streetwear',
    label: 'Bold Streetwear',
    brief: 'Chest-filling graphic, heavy drop shadows, festival merch density, dark void background.',
    typography: 'oversized kinetic stacked type',
    bestFor: ['humor', 'gaming', 'retro', 'nurse'],
  },
  {
    id: 'mascot_illustration',
    label: 'Mascot Illustration',
    brief: 'Giant original cartoon mascot with prop-locked slogan (headband/banner), thick outlines.',
    typography: 'prop-locked white/neon on accent ribbon',
    bestFor: ['pets', 'softball', 'baseball', 'teacher', 'nurse'],
  },
  {
    id: 'sports_poster',
    label: 'Sports Poster',
    brief: 'Commemorative tour-poster energy: arched headline over hero equipment illustration.',
    typography: 'arched athletic block + straight underline',
    bestFor: ['baseball', 'softball'],
  },
  {
    id: 'vintage_baseball_card',
    label: 'Vintage Baseball Card',
    brief: 'Card-frame illustration with stats-as-joke secondary text; aged paper texture look (print-safe).',
    typography: 'card title bar + small secondary',
    bestFor: ['baseball', 'softball'],
  },
  {
    id: 'animal_illustration',
    label: 'Animal Illustration',
    brief: 'Exaggerated original animal character, big expression, household chaos props.',
    typography: 'arched bubble or banner over character',
    bestFor: ['pets', 'bookish', 'humor'],
  },
  {
    id: 'food_illustration',
    label: 'Food Illustration',
    brief: 'Oversized food character with attitude; sticky/shiny cartoon surfaces, loud accents.',
    typography: 'curved diner script + bold secondary',
    bestFor: ['humor', 'teacher', 'nurse'],
  },
  {
    id: 'y2k',
    label: 'Y2K',
    brief: 'Bubble multi-color letters, daisy-as-letter energy, heavy layered shadows, candy neons.',
    typography: 'letter-as-icon bubble display',
    bestFor: ['retro', 'humor', 'gaming'],
  },
  {
    id: 'camping_badge',
    label: 'Camping Badge',
    brief: 'Circular badge / patch composition with trees/stars invented fresh; outdoor gift energy.',
    typography: 'circular badge + stacked center',
    bestFor: ['humor', 'teacher', 'bookish'],
  },
  {
    id: 'cute_kawaii',
    label: 'Cute / Kawaii',
    brief: 'Soft maximal cuteness with punchy contrast; still commercial and readable, not pastel mush.',
    typography: 'rounded bubble with outline',
    bestFor: ['pets', 'bookish', 'teacher'],
  },
  {
    id: 'distressed_screenprint',
    label: 'Distressed Screenprint',
    brief: 'Ink under/overprint feel, grit, limited palette, loud silhouette.',
    typography: 'distressed slab / college block',
    bestFor: ['baseball', 'softball', 'humor', 'gaming'],
  },
  {
    id: 'luxury_streetwear',
    label: 'Luxury Streetwear',
    brief: 'High-contrast premium graphic with oversized type and sparse supporting icons — still flashy, never boring minimal.',
    typography: 'huge clean display with one graphic weave',
    bestFor: ['humor', 'retro', 'nurse'],
  },
  {
    id: 'cyberpunk',
    label: 'Cyberpunk',
    brief: 'Neon rain energy, invented HUD shards (never real game UI), electric magenta/cyan.',
    typography: 'glitch outline + stacked neon',
    bestFor: ['gaming', 'retro'],
  },
  {
    id: 'retro_70s',
    label: '70s Retro',
    brief: 'Sunburst rays, groovy curves, warm oranges and browns, poster-print energy.',
    typography: 'curved groovy display + stacked secondary',
    bestFor: ['retro', 'humor', 'bookish'],
  },
  {
    id: 'cartoon_90s',
    label: '90s Cartoon',
    brief: 'Thick outlines, exaggerated squash/stretch, Saturday-morning energy, invented characters only.',
    typography: 'bubble outline + action burst',
    bestFor: ['pets', 'humor', 'gaming', 'retro'],
  },
  {
    id: 'hand_drawn_doodle',
    label: 'Hand-Drawn Doodle',
    brief: 'Loose ink energy with intentional wobble; still commercial and readable at chest size.',
    typography: 'hand-lettered stacked + underline',
    bestFor: ['teacher', 'bookish', 'humor'],
  },
  {
    id: 'college_graphic',
    label: 'College-Style Graphic',
    brief: 'Block letter athletic pride without real school marks; mascot energy, arched school-spirit type.',
    typography: 'arched collegiate block',
    bestFor: ['baseball', 'softball', 'teacher', 'nurse'],
  },
  {
    id: 'psychedelic',
    label: 'Psychedelic',
    brief: 'Warped shapes, wild color vibration, melting forms — original only, never brand parody.',
    typography: 'warped display weaving through art',
    bestFor: ['retro', 'humor', 'music'],
  },
  {
    id: 'western',
    label: 'Western',
    brief: 'Spur/star/rope motifs invented fresh; desert sunset palette, ranch badge composition.',
    typography: 'slab western arched',
    bestFor: ['humor', 'pets', 'softball'],
  },
  {
    id: 'gothic',
    label: 'Gothic',
    brief: 'Dark ornate frames, dramatic contrast, original crest energy without brand marks.',
    typography: 'ornate blackletter + thin secondary',
    bestFor: ['bookish', 'humor', 'retro'],
  },
  {
    id: 'minimal_premium',
    label: 'Minimal Premium',
    brief: 'Only when concept demands restraint — still one strong graphic hook, never plain text on white.',
    typography: 'large clean display with one icon weave',
    bestFor: ['nurse', 'teacher', 'bookish'],
  },
  {
    id: 'sticker_bomb',
    label: 'Sticker Bomb',
    brief: 'Layered sticker shapes, die-cut energy, multiple mini-graphics orbiting a hero mark.',
    typography: 'badge + sticker captions',
    bestFor: ['gaming', 'pets', 'humor', 'retro'],
  },
  {
    id: 'racing_graphic',
    label: 'Racing Graphic',
    brief: 'Speed stripes, checkered accents, motion blur energy — original team names only.',
    typography: 'italic speed type + number badge',
    bestFor: ['gaming', 'humor', 'retro'],
  },
  {
    id: 'heavy_metal_original',
    label: 'Heavy-Metal Inspired ORIGINAL',
    brief: 'Flames, lightning, ornate original crest — never band logos or album art clones.',
    typography: 'sharp metal display + arched banner',
    bestFor: ['gaming', 'humor', 'retro'],
  },
  {
    id: 'outdoor_adventure',
    label: 'Outdoor Adventure',
    brief: 'Mountains/trails/campfire as original illustration; gift-ready outdoor energy.',
    typography: 'badge + trail map secondary',
    bestFor: ['teacher', 'humor', 'bookish'],
  },
  {
    id: 'vaporwave',
    label: 'Vaporwave',
    brief: 'Pastel neon grids, marble busts invented fresh, sunset gradients — no brand cloning.',
    typography: 'chrome italic vapor',
    bestFor: ['retro', 'gaming', 'humor'],
  },
]

/** Deduped library (guards accidental duplicate ids in edits). */
export function listDesignStyles(): DesignStyle[] {
  const seen = new Set<string>()
  const out: DesignStyle[] = []
  for (const s of DESIGN_STYLE_LIBRARY) {
    if (seen.has(s.id)) continue
    seen.add(s.id)
    out.push(s)
  }
  return out
}

export function recommendStylesForNiche(niche: string, limit = 5): DesignStyle[] {
  const styles = listDesignStyles()
  const scored = styles.map((s) => ({
    s,
    score: s.bestFor.includes(niche) ? 10 : s.bestFor.some((b) => niche.includes(b)) ? 5 : 1,
  }))
  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map((x) => x.s)
}
