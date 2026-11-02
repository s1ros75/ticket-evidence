import { useState, type FormEvent } from 'react'
import { ValidationError } from '../api/client'
import { changePassword } from '../api/session'

export function PasswordPage() {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [done, setDone] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrors([])
    setDone(false)

    if (next !== confirmation) {
      setErrors(['新しいパスワードと確認用が一致しません'])
      return
    }

    setSubmitting(true)
    try {
      await changePassword(current, next)
      setDone(true)
      setCurrent('')
      setNext('')
      setConfirmation('')
    } catch (error) {
      setErrors(error instanceof ValidationError ? error.messages : ['変更できませんでした'])
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="narrow">
      <h1>パスワード変更</h1>
      {done && (
        <p role="status" className="notice">
          パスワードを変更しました。ほかの端末ではログインし直す必要があります。
        </p>
      )}
      <form className="ticket-form card" onSubmit={handleSubmit}>
        {errors.length > 0 && (
          <ul role="alert" className="errors">
            {errors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        )}
        <label>
          今のパスワード
          <input
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
          />
        </label>
        <label>
          新しいパスワード
          <input
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(event) => setNext(event.target.value)}
          />
        </label>
        <label>
          新しいパスワード（確認）
          <input
            type="password"
            autoComplete="new-password"
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </label>
        <p className="hint">12文字以上にしてください</p>
        <button type="submit" disabled={submitting}>
          変更
        </button>
      </form>
    </main>
  )
}
