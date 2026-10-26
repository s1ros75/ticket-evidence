import { ValidationError } from './client'

export type UserRole = 'member' | 'reviewer'

export type User = {
  id: number
  name: string
  email: string
  role: UserRole
}

export const ROLE_LABELS: Record<UserRole, string> = {
  member: '担当者',
  reviewer: 'レビュアー',
}

const SESSION_URL = '/api/v1/session'

// ログインしていなければnullを返す（401はここでは「未ログイン」という正常な結果として扱う）
export async function fetchCurrentUser(): Promise<User | null> {
  const response = await fetch(SESSION_URL)
  if (response.status === 401) {
    return null
  }
  if (!response.ok) {
    throw new Error(`GET ${SESSION_URL} failed: ${response.status}`)
  }
  return response.json()
}

export async function login(email: string, password: string): Promise<User> {
  const response = await fetch(SESSION_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (response.status === 401 || response.status === 429) {
    const body: { errors: string[] } = await response.json()
    throw new ValidationError(body.errors)
  }
  if (!response.ok) {
    throw new Error(`POST ${SESSION_URL} failed: ${response.status}`)
  }
  return response.json()
}

export async function logout(): Promise<void> {
  // APIはCSRF対策でJSON以外の変更系リクエストを断るので、本文がなくてもContent-Typeを付ける
  const response = await fetch(SESSION_URL, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
  })
  if (!response.ok) {
    throw new Error(`DELETE ${SESSION_URL} failed: ${response.status}`)
  }
}
