import { useEffect, useState, type ReactNode } from 'react'
import { setUnauthorizedHandler } from '../api/client'
import { fetchCurrentUser, logout, ROLE_LABELS, type User } from '../api/session'
import { CurrentUserContext } from '../auth/CurrentUserContext'
import { LoginPage } from '../pages/LoginPage'

type Props = {
  children: ReactNode
}

// ログインしていなければログイン画面を出す。URLは変えないので、ログイン後はそのまま元の画面に進む
export function AuthGate({ children }: Props) {
  // undefined: 確認中、null: 未ログイン
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    fetchCurrentUser()
      .then(setUser)
      .catch(() => setLoadError(true))
  }, [])

  // 使っている途中でセッションが切れたら、ログイン画面に戻す
  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null))
    return () => setUnauthorizedHandler(null)
  }, [])

  async function handleLogout() {
    await logout()
    setUser(null)
  }

  if (loadError) {
    return <p role="alert">サーバーに接続できませんでした</p>
  }
  if (user === undefined) {
    return <p>読み込み中…</p>
  }
  if (user === null) {
    return <LoginPage onLoggedIn={setUser} />
  }

  return (
    <CurrentUserContext.Provider value={user}>
      <header className="app-header">
        <span className="user">
          <span>{user.name}</span>
          <span className="role">{ROLE_LABELS[user.role]}</span>
        </span>
        <button type="button" className="secondary" onClick={handleLogout}>
          ログアウト
        </button>
      </header>
      {children}
    </CurrentUserContext.Provider>
  )
}
