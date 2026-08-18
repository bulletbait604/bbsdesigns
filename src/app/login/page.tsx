'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type AuthStatus = {
  ok: boolean
  username: string
  mongoConfigured: boolean
  setupTokenConfigured?: boolean
  authSecretReady?: boolean
  passwordSet: boolean
  authenticated: boolean
  needsSetup: boolean
  message?: string
  error?: string
}

export default function LoginPage() {
  const router = useRouter()
  const [status, setStatus] = useState<AuthStatus | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [setupToken, setSetupToken] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void (async () => {
      const res = await fetch('/api/auth/status')
      const data = (await res.json()) as AuthStatus
      setStatus(data)
      if (data.authenticated) {
        const next = new URLSearchParams(window.location.search).get('next') || '/dashboard'
        router.replace(next.startsWith('/') ? next : '/dashboard')
      }
    })()
  }, [router])

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setBusy(true)
    try {
      const needsSetup = Boolean(status?.needsSetup && status.mongoConfigured)
      const endpoint = needsSetup ? '/api/auth/setup' : '/api/auth/login'
      const body = needsSetup
        ? {
            username: 'Admin',
            password,
            confirmPassword,
            setupToken,
          }
        : { username: 'Admin', password }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = (await res.json()) as { ok: boolean; error?: string }
      if (!res.ok || !data.ok) {
        setError(data.error || 'Login failed')
        setPassword('')
        setConfirmPassword('')
        return
      }
      const next = new URLSearchParams(window.location.search).get('next') || '/dashboard'
      router.replace(next.startsWith('/') ? next : '/dashboard')
      router.refresh()
    } catch {
      setError('Network error — try again')
    } finally {
      setBusy(false)
    }
  }

  const needsSetup = Boolean(status?.needsSetup && status.mongoConfigured)
  const blocked =
    status &&
    (!status.mongoConfigured ||
      (needsSetup && !status.setupTokenConfigured) ||
      status.authSecretReady === false)

  return (
    <main className="scoreboard-grid flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md rounded-md border border-line bg-panel/90 p-6 shadow-lg">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">bbsdesigns</p>
        <h1 className="font-display mt-2 text-3xl font-bold text-text">
          {needsSetup ? 'Secure admin setup' : 'Admin login'}
        </h1>
        <p className="mt-2 text-sm text-muted">
          {needsSetup
            ? 'Only you can finish this. Enter your private setup token from Vercel env, then choose a strong Admin password (saved hashed in MongoDB).'
            : 'Dashboard access is locked to username Admin. Sessions expire in 7 days.'}
        </p>

        {blocked ? (
          <div className="mt-5 rounded-md border border-warn/40 bg-warn/10 p-3 text-sm text-warn">
            {!status?.mongoConfigured
              ? 'Set MONGODB_URI in Vercel, then redeploy.'
              : status.authSecretReady === false
                ? 'Set AUTH_SECRET (32+ random characters) in Vercel, then redeploy.'
                : 'Set ADMIN_SETUP_TOKEN (16+ random characters) in Vercel before first password setup, then redeploy.'}
          </div>
        ) : null}

        <form className="mt-6 space-y-4" onSubmit={onSubmit} autoComplete="off">
          <label className="block text-sm">
            <span className="text-muted">Username</span>
            <input
              className="mt-1 w-full rounded-md border border-line bg-ink/60 px-3 py-2 text-text"
              value="Admin"
              readOnly
              autoComplete="username"
            />
          </label>

          {needsSetup ? (
            <label className="block text-sm">
              <span className="text-muted">Setup token (from Vercel ADMIN_SETUP_TOKEN)</span>
              <input
                type="password"
                className="mt-1 w-full rounded-md border border-line bg-ink px-3 py-2 text-text outline-none focus:border-accent"
                value={setupToken}
                onChange={(e) => setSetupToken(e.target.value)}
                autoComplete="off"
                required
                disabled={Boolean(blocked)}
              />
            </label>
          ) : null}

          <label className="block text-sm">
            <span className="text-muted">{needsSetup ? 'New password (12+ chars, letters + numbers)' : 'Password'}</span>
            <input
              type="password"
              className="mt-1 w-full rounded-md border border-line bg-ink px-3 py-2 text-text outline-none focus:border-accent"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={needsSetup ? 'new-password' : 'current-password'}
              required
              minLength={12}
              disabled={Boolean(blocked)}
            />
          </label>

          {needsSetup ? (
            <label className="block text-sm">
              <span className="text-muted">Confirm password</span>
              <input
                type="password"
                className="mt-1 w-full rounded-md border border-line bg-ink px-3 py-2 text-text outline-none focus:border-accent"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
                minLength={12}
                disabled={Boolean(blocked)}
              />
            </label>
          ) : null}

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          <button
            type="submit"
            disabled={busy || Boolean(blocked) || !status}
            className="w-full rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-ink disabled:opacity-50"
          >
            {busy ? 'Working…' : needsSetup ? 'Lock password & enter' : 'Sign in'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-muted">
          <Link href="/" className="text-accent-2 hover:underline">
            Back to home
          </Link>
        </p>
      </div>
    </main>
  )
}
