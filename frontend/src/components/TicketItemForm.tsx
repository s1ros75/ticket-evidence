import { useState, type FormEvent } from 'react'
import {
  createTicketItem,
  ITEM_KIND_LABELS,
  ITEM_KINDS,
  ValidationError,
  type TicketItem,
  type TicketItemKind,
} from '../api/tickets'

type Props = {
  ticketId: number
  onCreated: (item: TicketItem) => void
}

export function TicketItemForm({ ticketId, onCreated }: Props) {
  const [kind, setKind] = useState<TicketItemKind>('unknown')
  const [body, setBody] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setErrors([])

    try {
      const item = await createTicketItem(ticketId, { kind, body })
      onCreated(item)
      // 同じ種別を続けて入れることが多いので、種別は残して内容だけ空にする
      setBody('')
    } catch (error) {
      setErrors(error instanceof ValidationError ? error.messages : ['追加できませんでした'])
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="ticket-form" onSubmit={handleSubmit}>
      {errors.length > 0 && (
        <ul role="alert" className="errors">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
      <label>
        種別
        <select value={kind} onChange={(event) => setKind(event.target.value as TicketItemKind)}>
          {ITEM_KINDS.map((value) => (
            <option key={value} value={value}>
              {ITEM_KIND_LABELS[value]}
            </option>
          ))}
        </select>
      </label>
      <label>
        内容
        <textarea value={body} onChange={(event) => setBody(event.target.value)} />
      </label>
      <button type="submit" disabled={submitting}>
        追加
      </button>
    </form>
  )
}
