import { MIN_PASSWORD_LENGTH } from '@/lib/auth/constants'
import bcrypt from 'bcryptjs'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 14)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function validateNewPassword(password: string, confirm: string): string | null {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters`
  }
  if (password !== confirm) {
    return 'Passwords do not match'
  }
  if (/\s/.test(password)) {
    return 'Password cannot contain spaces'
  }
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return 'Password must include letters and numbers'
  }
  if (password.toLowerCase().includes('admin') || password.toLowerCase().includes('password')) {
    return 'Password is too predictable'
  }
  return null
}
