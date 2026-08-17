export class AppError extends Error {
  readonly statusCode: number
  readonly code: string
  readonly details?: unknown

  constructor(message: string, opts?: { statusCode?: number; code?: string; details?: unknown }) {
    super(message)
    this.name = 'AppError'
    this.statusCode = opts?.statusCode ?? 500
    this.code = opts?.code ?? 'APP_ERROR'
    this.details = opts?.details
  }
}

export function toErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}
