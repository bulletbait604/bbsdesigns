/**
 * Provider interfaces live here.
 * Concrete adapters (OpenAI, Gemini, Shopify, Printify, R2, etc.) come in later prompts.
 */

export interface TextProvider {
  readonly name: string
  complete(prompt: string): Promise<string>
}

export interface ImageProvider {
  readonly name: string
  generate(prompt: string): Promise<{ bytes: Buffer; mimeType: string }>
}

export interface TrendProvider {
  readonly name: string
  fetchSignals(niche: string): Promise<Array<{ id: string; title: string; scoreHint?: number }>>
}

export interface StorageProvider {
  readonly name: string
  putObject(key: string, body: Buffer, contentType: string): Promise<string>
}

export interface ShopifyProvider {
  readonly name: string
  createDraftProduct(input: unknown): Promise<{ id: string }>
}

export interface PodProvider {
  readonly name: string
  createProduct(input: unknown): Promise<{ id: string }>
}
