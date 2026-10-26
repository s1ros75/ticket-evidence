import { useState, type FormEvent } from 'react'
import { approveTicket, sendBackTicket, ValidationError, type Ticket, type TicketDetail } from '../api/tickets'

type Props = {
  ticketId: number
  onApproved: (ticket: Ticket) => void
  onSentBack: (ticket: TicketDetail) => void
}

export function ReviewDecision({ ticketId, onApproved, onSentBack }: Props) {
  const [sendingBack, setSendingBack] = useState(false)
  const [reason, setReason] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  async function submit<T>(request: () => Promise<T>, onSuccess: (result: T) => void, fallbackMessage: string) {
    setSubmitting(true)
    setErrors([])

    try {
      onSuccess(await request())
    } catch (error) {
      setErrors(error instanceof ValidationError ? error.messages : [fallbackMessage])
      setSubmitting(false)
    }
  }

  function handleApprove() {
    submit(() => approveTicket(ticketId), onApproved, '完了にできませんでした')
  }

  function handleSendBack(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    submit(() => sendBackTicket(ticketId, reason), onSentBack, '差し戻せませんでした')
  }

  return (
    <div className="review-decision">
      {errors.length > 0 && (
        <ul role="alert" className="errors">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}

      {sendingBack ? (
        <form className="ticket-form" onSubmit={handleSendBack}>
          <label>
            差し戻しの理由
            <textarea
              value={reason}
              placeholder="不明点として追加されます"
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <div className="actions">
            <button type="submit" disabled={submitting}>
              理由を付けて差し戻す
            </button>
            <button type="button" className="secondary" onClick={() => setSendingBack(false)}>
              やめる
            </button>
          </div>
        </form>
      ) : (
        <div className="actions">
          <button type="button" className="primary" disabled={submitting} onClick={handleApprove}>
            完了にする
          </button>
          <button type="button" className="secondary" disabled={submitting} onClick={() => setSendingBack(true)}>
            差し戻す
          </button>
        </div>
      )}
    </div>
  )
}
