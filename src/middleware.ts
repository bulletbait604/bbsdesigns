import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'
import { AUTH_COOKIE_NAME, ADMIN_USERNAME } from '@/lib/auth/constants'

/**
 * Edge-safe secret bytes — must match `getAuthSecret()` in Node route handlers.
 * AUTH_SECRET must be set in Vercel for Production (and Preview if you use it).
 */
async function resolveKey(): Promise<Uint8Array> {
  const fromEnv = (process.env.AUTH_SECRET || '').trim()
  if (fromEnv.length >= 32) {
    return new TextEncoder().encode(fromEnv)
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET required')
  }

  const appUrl = process.env.APP_URL || 'http://localhost:3000'
  const bytes = new TextEncoder().encode(`bbsdesigns-dev-auth|${appUrl}`)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const hex = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return new TextEncoder().encode(hex)
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (!pathname.startsWith('/dashboard')) {
    return NextResponse.next()
  }

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value
  if (!token) {
    const login = new URL('/login', request.url)
    login.searchParams.set('next', pathname)
    return NextResponse.redirect(login)
  }

  try {
    const key = await resolveKey()
    const { payload } = await jwtVerify(token, key)
    if (payload.username !== ADMIN_USERNAME || payload.role !== 'admin') {
      throw new Error('invalid session')
    }
    return NextResponse.next()
  } catch (error) {
    const login = new URL('/login', request.url)
    login.searchParams.set('next', pathname)
    const message = error instanceof Error ? error.message : ''
    if (message.includes('AUTH_SECRET')) {
      login.searchParams.set('err', 'auth_secret')
    } else {
      login.searchParams.set('err', 'session')
    }
    const response = NextResponse.redirect(login)
    response.cookies.set(AUTH_COOKIE_NAME, '', {
      path: '/',
      maxAge: 0,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    })
    return response
  }
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
