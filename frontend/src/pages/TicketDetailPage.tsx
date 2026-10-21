import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  fetchTicket,
  ITEM_KIND_LABELS,
  ITEM_KINDS,
  NotFoundError,
  STATUS_LABELS,
  type TicketDetail,
  type TicketItem,
} from '../api/tickets'
import { TicketItemForm } from '../components/TicketItemForm'

type Props = {
  id: string
}

type LoadError = 'not_found' | 'failed'

export function TicketDetailPage({ id }: Props) {
  const [ticket, setTicket] = useState<TicketDetail | null>(null)
  const [loadError, setLoadError] = useState<LoadError | null>(null)

  useEffect(() => {
    fetchTicket(id)
      .then(setTicket)
      .catch((error) => setLoadError(error instanceof NotFoundError ? 'not_found' : 'failed'))
  }, [id])

  function handleItemCreated(item: TicketItem) {
    setTicket((current) => current && { ...current, items: [...current.items, item] })
  }

  return (
    <main>
      <p>
        <Link to="/">← 一覧へ戻る</Link>
      </p>

      {loadError === 'not_found' ? (
        <p role="alert">チケットが見つかりません</p>
      ) : loadError === 'failed' ? (
        <p role="alert">チケットを取得できませんでした</p>
      ) : ticket === null ? (
        <p>読み込み中…</p>
      ) : (
        <>
          <h1>{ticket.title}</h1>
          <p>
            <span className={`status status-${ticket.status}`}>{STATUS_LABELS[ticket.status]}</span>
          </p>
          {ticket.description && <p className="description">{ticket.description}</p>}

          {ITEM_KINDS.map((kind) => {
            const items = ticket.items.filter((item) => item.kind === kind)
            const headingId = `items-${kind}`
            return (
              <section key={kind} aria-labelledby={headingId} className={`items items-${kind}`}>
                <h2 id={headingId}>{ITEM_KIND_LABELS[kind]}</h2>
                {items.length === 0 ? (
                  <p className="empty">まだありません</p>
                ) : (
                  <ul>
                    {items.map((item) => (
                      <li key={item.id}>{item.body}</li>
                    ))}
                  </ul>
                )}
              </section>
            )
          })}

          <section>
            <h2>項目を追加</h2>
            <TicketItemForm ticketId={ticket.id} onCreated={handleItemCreated} />
          </section>
        </>
      )}
    </main>
  )
}
