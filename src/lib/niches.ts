/** All merch research niches — identity × interest viral POD lanes. */
export const NICHES = [
  'gaming',
  'baseball',
  'softball',
  'pets',
  'teacher',
  'nurse',
  'humor',
  'retro',
  'bookish',
] as const

export type Niche = (typeof NICHES)[number]

export const NICHE_ENUM: Niche[] = [...NICHES]

export function isNiche(value: string): value is Niche {
  return (NICHES as readonly string[]).includes(value)
}

export const NICHE_LABELS: Record<Niche, string> = {
  gaming: 'Gaming humor',
  baseball: 'Baseball humor',
  softball: 'Softball humor',
  pets: 'Pet parent / dog mom',
  teacher: 'Teacher / educator',
  nurse: 'Nurse / healthcare',
  humor: 'Viral sarcastic humor',
  retro: 'Retro / Y2K graphic',
  bookish: 'Book / reader humor',
}
