import { useEffect, useState, type FormEvent } from 'react'
import { createUser, fetchUsers, resetPassword, type NewUserInput } from '../api/admin'
import { ValidationError } from '../api/client'
import { ROLE_LABELS, type User, type UserRole } from '../api/session'
import { useCurrentUser } from '../auth/CurrentUserContext'

const EMPTY_INPUT: NewUserInput = { name: '', email: '', role: 'member', admin: false }

type IssuedPassword = { name: string; password: string }

export function AccountsPage() {
  const currentUser = useCurrentUser()

  return (
    <main>
      <h1>アカウント管理</h1>
      {currentUser.admin ? <Accounts /> : <p>アカウント管理は管理者だけが使えます</p>}
    </main>
  )
}

function Accounts() {
  const [users, setUsers] = useState<User[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  const [input, setInput] = useState<NewUserInput>(EMPTY_INPUT)
  const [errors, setErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  // 仮パスワードはDBにハッシュしか残らないので、発行した直後のこの表示が唯一の確認手段
  const [issued, setIssued] = useState<IssuedPassword | null>(null)

  useEffect(() => {
    fetchUsers()
      .then(setUsers)
      .catch(() => setLoadError(true))
  }, [])

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setErrors([])

    try {
      const { user, temporary_password } = await createUser(input)
      setUsers((current) => [...(current ?? []), user])
      setIssued({ name: user.name, password: temporary_password })
      setInput(EMPTY_INPUT)
    } catch (error) {
      setErrors(error instanceof ValidationError ? error.messages : ['作成できませんでした'])
    } finally {
      setSubmitting(false)
    }
  }

  async function handleReset(user: User) {
    setErrors([])
    try {
      const { temporary_password } = await resetPassword(user.id)
      setIssued({ name: user.name, password: temporary_password })
    } catch {
      setErrors(['仮パスワードを発行できませんでした'])
    }
  }

  return (
    <>
      {issued && (
        <div role="status" className="notice">
          <p>
            {issued.name} の仮パスワード：<code>{issued.password}</code>
          </p>
          <p>本人に伝えてください。この画面を離れると、もう表示できません。</p>
        </div>
      )}

      <section className="card">
        <h2>アカウントを作成</h2>
        <form className="ticket-form" onSubmit={handleCreate}>
          {errors.length > 0 && (
            <ul role="alert" className="errors">
              {errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
          <label>
            名前
            <input value={input.name} onChange={(event) => setInput({ ...input, name: event.target.value })} />
          </label>
          <label>
            メールアドレス
            <input
              type="email"
              value={input.email}
              onChange={(event) => setInput({ ...input, email: event.target.value })}
            />
          </label>
          <label>
            ロール
            <select
              value={input.role}
              onChange={(event) => setInput({ ...input, role: event.target.value as UserRole })}
            >
              {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]}
                </option>
              ))}
            </select>
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={input.admin}
              onChange={(event) => setInput({ ...input, admin: event.target.checked })}
            />
            管理者にする
          </label>
          <button type="submit" disabled={submitting}>
            作成
          </button>
        </form>
      </section>

      <section className="card">
        <h2>アカウント一覧</h2>
        {loadError ? (
          <p role="alert">アカウントを取得できませんでした</p>
        ) : users === null ? (
          <p>読み込み中…</p>
        ) : (
          <table className="accounts">
            <thead>
              <tr>
                <th>名前</th>
                <th>メールアドレス</th>
                <th>ロール</th>
                <th>
                  <span className="visually-hidden">操作</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td>
                    {ROLE_LABELS[user.role]}
                    {user.admin && <span className="badge">管理者</span>}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="secondary"
                      aria-label={`${user.name} の仮パスワードを発行`}
                      onClick={() => handleReset(user)}
                    >
                      仮パスワードを発行
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  )
}
