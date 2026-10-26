import { useState } from 'react'
import { requestTicketReview, ValidationError, type Ticket } from '../api/tickets'

type Props = {
  ticketId: number
  unknownCount: number
  onRequested: (ticket: Ticket) => void
}

// 進めるかどうかの最終判断はAPI（RequestTicketReview）が行う。画面では押す前に分かるよう残数を見せる
export function ReviewRequest({ ticketId, unknownCount, onRequested }: Props) {
  const [errors, setErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)

  async function handleClick() {
    setSubmitting(true)
    setErrors([])

    try {
      onRequested(await requestTicketReview(ticketId))
    } catch (error) {
      setErrors(error instanceof ValidationError ? error.messages : ['レビュー依頼に進めませんでした'])
      setSubmitting(false)
    }
  }

  return (
    <div className="review-request">
      {errors.length > 0 && (
        <ul role="alert" className="errors">
          {errors.map((message) => (
            <li key={message}>{message}</li>
          ))}
        </ul>
      )}
      {unknownCount > 0 && (
        <p className="blocked">不明点が{unknownCount}件残っています。すべて解決するとレビュー依頼に進めます</p>
      )}
      <button type="button" className="primary" disabled={unknownCount > 0 || submitting} onClick={handleClick}>
        レビュー依頼に進む
      </button>
    </div>
  )
}
