import { createContext, useContext } from 'react'
import type { User } from '../api/session'

// AuthGateの内側では、ログイン中のユーザーが必ず入る
export const CurrentUserContext = createContext<User | null>(null)

export function useCurrentUser(): User {
  const user = useContext(CurrentUserContext)
  if (!user) {
    throw new Error('useCurrentUser は AuthGate の内側で使ってください')
  }
  return user
}
