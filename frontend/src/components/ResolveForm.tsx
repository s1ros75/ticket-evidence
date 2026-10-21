import { useState, type FormEvent } from 'react'
import { resolveTicketItem, ValidationError, type TicketItem } from '../api/tickets'

type Props = {
  item: TicketItem
  onResolved: (item: TicketItem) => void
  onCancel: () => void
}

export function ResolveForm({ item, onResolved, onCancel }: Props) {
  const [url, setUrl] = useState('')
  const [memo, setMemo] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setErrors([])

    try {
      onResolved(await resolveTicketItem(item.ticket_id, item.id, { url, memo }))
    } catch (error) {
      setErrors(error instanceof ValidationError ? error.messages : ['解決できませんでした'])
      setSubmitting(false)
    }
  }

  return (
    <form className="ticket-form resolve-form" onSubmit={handleSubmit}>
      {errors.length > 0 && (
        <ul role="alert" className="errors">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
      <label>
        リンク
        <input type="url" value={url} placeholder="https://" onChange={(event) => setUrl(event.target.value)} />
      </label>
      <label>
        メモ
        <textarea value={memo} onChange={(event) => setMemo(event.target.value)} />
      </label>
      <div className="actions">
        <button type="submit" disabled={submitting}>
          根拠を付けて解決
        </button>
        <button type="button" className="secondary" onClick={onCancel}>
          やめる
        </button>
      </div>
    </form>
  )
}
