import { useState, type FormEvent } from 'react'
import { ValidationError } from '../api/client'
import { login, type User } from '../api/session'

type Props = {
  onLoggedIn: (user: User) => void
}

export function LoginPage({ onLoggedIn }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setErrors([])

    try {
      onLoggedIn(await login(email, password))
    } catch (error) {
      setErrors(error instanceof ValidationError ? error.messages : ['ログインできませんでした'])
      setSubmitting(false)
    }
  }

  return (
    <main className="login">
      <h1>ログイン</h1>
      <form className="ticket-form" onSubmit={handleSubmit}>
        {errors.length > 0 && (
          <ul role="alert" className="errors">
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        )}
        <label>
          メールアドレス
          <input
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label>
          パスワード
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <button type="submit" disabled={submitting}>
          ログイン
        </button>
      </form>
    </main>
  )
}
