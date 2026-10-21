import { STATUS_LABELS, type Ticket } from '../api/tickets'

type Props = {
  tickets: Ticket[]
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
          <span className="title">{ticket.title}</span>
        </li>
      ))}
    </ul>
  )
}
