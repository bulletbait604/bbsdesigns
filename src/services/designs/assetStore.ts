import { createHash } from 'crypto'

type StoredAsset = {
  id: string
  bytes: Buffer
  mimeType: string
  createdAt: string
  slogan: string
  niche: string
}

const assets = new Map<string, StoredAsset>()

export function storeDesignAsset(input: {
  bytes: Buffer
  mimeType: string
  slogan: string
  niche: string
}): StoredAsset {
  const id = createHash('sha256')
    .update(`${input.slogan}|${input.niche}|${Date.now()}|${input.bytes.length}`)
    .digest('hex')
    .slice(0, 24)

  const asset: StoredAsset = {
    id,
    bytes: input.bytes,
    mimeType: input.mimeType,
    createdAt: new Date().toISOString(),
    slogan: input.slogan,
    niche: input.niche,
  }
  assets.set(id, asset)

  // Cap memory in serverless / long-running processes
  if (assets.size > 40) {
    const oldest = [...assets.keys()].slice(0, assets.size - 40)
    for (const key of oldest) assets.delete(key)
  }

  return asset
}

export function getDesignAsset(id: string): StoredAsset | undefined {
  return assets.get(id)
}
