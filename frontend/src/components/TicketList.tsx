import { Link } from 'react-router'
import { STATUS_LABELS, type TicketSummary } from '../api/tickets'

type Props = {
  tickets: TicketSummary[]
}

export function TicketList({ tickets }: Props) {
  if (tickets.length === 0) {
    return <p>チケットはまだありません</p>
  }

  return (
    <ul className="ticket-list">
      {tickets.map((ticket) => (
        <li key={ticket.id}>
          <span className={`status status-${ticket.status}`}>{STATUS_LABELS[ticket.status]}</span>
          <Link className="title" to={`/tickets/${ticket.id}`}>
            {ticket.title}
          </Link>
          {ticket.unknown_count > 0 ? (
            <span className="unknown-count">不明点 {ticket.unknown_count}件</span>
          ) : (
            <span className="unknown-count none">不明点なし</span>
          )}
        </li>
      ))}
    </ul>
  )
}
