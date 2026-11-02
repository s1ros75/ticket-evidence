import { useEffect, useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router'
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
      {import.meta.env.VITE_DEMO_MODE === '1' && (
        <p role="note" className="demo-banner">
          デモ環境です。データは毎日リセットされます。パスワード変更と仮パスワードの発行は使えません。
        </p>
      )}
      <header className="app-header">
        <div className="app-header-inner">
          <Link to="/" className="brand">
            Ticket Evidence
          </Link>
          <nav aria-label="メイン" className="main-nav">
            <NavLink to="/" end>
              チケット一覧
            </NavLink>
            <NavLink to="/dashboard">ダッシュボード</NavLink>
            {user.admin && <NavLink to="/admin/users">アカウント管理</NavLink>}
          </nav>
          <div className="account">
            <span className="avatar" aria-hidden="true">
              {user.name.slice(0, 1)}
            </span>
            <span className="user">
              <span>{user.name}</span>
              <span className="role">{ROLE_LABELS[user.role]}</span>
            </span>
            <Link to="/password">パスワード変更</Link>
            <button type="button" className="text" onClick={handleLogout}>
              ログアウト
            </button>
          </div>
        </div>
      </header>
      {children}
    </CurrentUserContext.Provider>
  )
}
