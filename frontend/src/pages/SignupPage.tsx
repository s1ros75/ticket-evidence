import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { ValidationError } from '../api/client'
import { signUp, type CurrentUser, type SignupInput } from '../api/session'

type Props = {
  onSignedUp: (user: CurrentUser) => void
}

const EMPTY_INPUT: SignupInput = { organization_name: '', name: '', email: '', password: '' }

// 新しい組織を申し込む。登録した人が、その組織の最初の管理者になる
export function SignupPage({ onSignedUp }: Props) {
  const [input, setInput] = useState<SignupInput>(EMPTY_INPUT)
  const [errors, setErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  function update(field: keyof SignupInput, value: string) {
    setInput((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setErrors([])

    try {
      onSignedUp(await signUp(input))
    } catch (error) {
      setErrors(error instanceof ValidationError ? error.messages : ['登録できませんでした'])
      setSubmitting(false)
    }
  }

  return (
    <main className="login">
      <div className="login-card">
        <p className="brand">Ticket Evidence</p>
        <h1>組織を登録</h1>
        <p className="login-lead">登録したあなたが、この組織の管理者になります。メンバーはあとからアカウント管理で追加できます。</p>
        <form className="ticket-form" onSubmit={handleSubmit}>
          {errors.length > 0 && (
            <ul role="alert" className="errors">
              {errors.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
          )}
          <label>
            組織名
            <input
              autoComplete="organization"
              value={input.organization_name}
              onChange={(event) => update('organization_name', event.target.value)}
            />
          </label>
          <label>
            あなたの名前
            <input autoComplete="name" value={input.name} onChange={(event) => update('name', event.target.value)} />
          </label>
          <label>
            メールアドレス
            <input
              type="email"
              autoComplete="username"
              value={input.email}
              onChange={(event) => update('email', event.target.value)}
            />
          </label>
          <label>
            パスワード（12文字以上）
            <input
              type="password"
              autoComplete="new-password"
              value={input.password}
              onChange={(event) => update('password', event.target.value)}
            />
          </label>
          <button type="submit" disabled={submitting}>
            登録して始める
          </button>
        </form>
        <p className="login-switch">
          <Link to="/">ログインに戻る</Link>
        </p>
      </div>
    </main>
  )
}
