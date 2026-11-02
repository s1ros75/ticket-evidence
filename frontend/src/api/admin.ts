import { getJson, postJson } from './client'
import type { User, UserRole } from './session'

export type NewUserInput = {
  name: string
  email: string
  role: UserRole
  admin: boolean
}

const USERS_URL = '/api/v1/admin/users'

export function fetchUsers(): Promise<User[]> {
  return getJson(USERS_URL)
}

// 仮パスワードは、この応答で1回だけ受け取れる
export function createUser(input: NewUserInput): Promise<{ user: User; temporary_password: string }> {
  return postJson(USERS_URL, { user: input })
}

export function resetPassword(userId: number): Promise<{ temporary_password: string }> {
  return postJson(`${USERS_URL}/${userId}/reset_password`, {})
}
