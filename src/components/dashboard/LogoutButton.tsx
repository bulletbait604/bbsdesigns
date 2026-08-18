'use client'

import { useRouter } from 'next/navigation'

export function LogoutButton() {
  const router = useRouter()

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.replace('/login')
    router.refresh()
  }

  return (
    <button
      type="button"
      onClick={() => void logout()}
      className="mt-4 w-full rounded-md border border-line px-3 py-2 text-left text-sm text-muted transition hover:border-danger/50 hover:text-danger md:mt-6"
    >
      Sign out
    </button>
  )
}
