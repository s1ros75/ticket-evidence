import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import {
  fetchTicket,
  ITEM_KIND_LABELS,
  ITEM_KINDS,
  NotFoundError,
  STATUS_LABELS,
  type Ticket,
  type TicketDetail,
  type TicketItem,
} from '../api/tickets'
import { ReviewDecision } from '../components/ReviewDecision'
import { ReviewRequest } from '../components/ReviewRequest'
import { TicketItemForm } from '../components/TicketItemForm'
import { TicketItemView } from '../components/TicketItemView'

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

  // 解決すると種別が確認済みに変わるので、差し替えるだけで表示する欄も移る
  function handleItemResolved(resolved: TicketItem) {
    setTicket(
      (current) =>
        current && { ...current, items: current.items.map((item) => (item.id === resolved.id ? resolved : item)) },
    )
  }

  // レビュー依頼・完了のAPIは項目を含まないチケットを返すので、項目は手元のものを残す
  function handleStatusChanged(updated: Ticket) {
    setTicket((current) => current && { ...current, ...updated, items: current.items })
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

          {ticket.status === 'investigating' && (
            <ReviewRequest
              ticketId={ticket.id}
              unknownCount={ticket.items.filter((item) => item.kind === 'unknown').length}
              onRequested={handleStatusChanged}
            />
          )}

          {ticket.status === 'in_review' && (
            <ReviewDecision ticketId={ticket.id} onApproved={handleStatusChanged} onSentBack={setTicket} />
          )}

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
                      <TicketItemView key={item.id} item={item} onResolved={handleItemResolved} />
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
