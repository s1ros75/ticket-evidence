import { STATUS_LABELS, TICKET_STATUSES, type TicketStatus } from '../api/tickets'

type Props = {
  value: TicketStatus | undefined
  onChange: (value: TicketStatus | undefined) => void
}

export function StatusFilter({ value, onChange }: Props) {
  return (
    <label className="status-filter">
      ステータス
      <select
        value={value ?? ''}
        onChange={(event) => onChange((event.target.value || undefined) as TicketStatus | undefined)}
      >
        <option value="">すべて</option>
        {TICKET_STATUSES.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABELS[status]}
          </option>
        ))}
      </select>
    </label>
  )
}
