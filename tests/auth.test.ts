import { describe, expect, it } from 'vitest'
import { validateNewPassword, hashPassword, verifyPassword } from '@/lib/auth/password'
import { ADMIN_USERNAME, MIN_PASSWORD_LENGTH } from '@/lib/auth/constants'
import { isAdminUsername, safeEqualString } from '@/lib/auth/security'

describe('admin auth helpers', () => {
  it('locks username constant to Admin', () => {
    expect(ADMIN_USERNAME).toBe('Admin')
    expect(isAdminUsername('Admin')).toBe(true)
    expect(isAdminUsername('admin')).toBe(false)
  })

  it('compares strings safely', () => {
    expect(safeEqualString('abc', 'abc')).toBe(true)
    expect(safeEqualString('abc', 'abd')).toBe(false)
  })

  it('validates strong new passwords', () => {
    expect(MIN_PASSWORD_LENGTH).toBe(12)
    expect(validateNewPassword('short1', 'short1')).toMatch(/at least/i)
    expect(validateNewPassword('longenough12', 'different12')).toMatch(/match/i)
    expect(validateNewPassword('has space12ab', 'has space12ab')).toMatch(/spaces/i)
    expect(validateNewPassword('onlylettersaa', 'onlylettersaa')).toMatch(/letters and numbers/i)
    expect(validateNewPassword('AdminPassword1', 'AdminPassword1')).toMatch(/predictable/i)
    expect(validateNewPassword('SecurePass99x', 'SecurePass99x')).toBeNull()
  })

  it('hashes and verifies passwords', async () => {
    const hash = await hashPassword('SecurePass99x')
    expect(hash).not.toBe('SecurePass99x')
    expect(await verifyPassword('SecurePass99x', hash)).toBe(true)
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })
})
