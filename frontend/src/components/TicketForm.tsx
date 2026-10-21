import { useState, type FormEvent } from 'react'
import { createTicket, ValidationError, type Ticket } from '../api/tickets'

type Props = {
  onCreated: (ticket: Ticket) => void
}

export function TicketForm({ onCreated }: Props) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setErrors([])

    try {
      const ticket = await createTicket({ title, description })
      onCreated(ticket)
      setTitle('')
      setDescription('')
    } catch (error) {
      setErrors(error instanceof ValidationError ? error.messages : ['作成できませんでした'])
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
        タイトル
        <input value={title} onChange={(event) => setTitle(event.target.value)} />
      </label>
      <label>
        概要
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
      </label>
      <button type="submit" disabled={submitting}>
        作成
      </button>
    </form>
  )
}
