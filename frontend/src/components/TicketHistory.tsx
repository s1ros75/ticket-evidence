import { useEffect, useState } from 'react'
import { fetchTicketEvents, ITEM_KIND_LABELS, STATUS_LABELS, type TicketEvent } from '../api/tickets'

type Props = {
  ticketId: number
  // 詳細画面で操作するたびに増える。開いているときは、これが変わったら読み直す
  refreshKey: number
}

function statusChange([before, after]: [keyof typeof STATUS_LABELS, keyof typeof STATUS_LABELS]) {
  return `${STATUS_LABELS[before]} → ${STATUS_LABELS[after]}`
}

function describe(event: TicketEvent): string {
  switch (event.action) {
    case 'ticket_created':
      return `チケットを作成：${event.details.title}`
    case 'item_added':
      return `${ITEM_KIND_LABELS[event.details.kind]}を追加：${event.details.body}`
    case 'item_resolved': {
      const { url, memo } = event.details.evidence
      const evidence = [url, memo].filter(Boolean).join('、')
      return `${ITEM_KIND_LABELS[event.details.kind[0]]}を解決：${event.details.body}（根拠：${evidence}）`
    }
    case 'review_requested':
      return `レビュー依頼（${statusChange(event.details.status)}）`
    case 'approved':
      return `完了（${statusChange(event.details.status)}）`
    case 'sent_back':
      return `差し戻し（${statusChange(event.details.status)}）：${event.details.reason}`
  }
}

// 履歴は毎回見るものではないので、開いたときに読み込む
export function TicketHistory({ ticketId, refreshKey }: Props) {
  const [open, setOpen] = useState(false)
  const [events, setEvents] = useState<TicketEvent[] | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    if (!open) return

    let ignore = false
    fetchTicketEvents(ticketId)
      .then((result) => {
        if (ignore) return
        setEvents(result)
        setLoadError(false)
      })
      .catch(() => {
        if (!ignore) setLoadError(true)
      })
    return () => {
      ignore = true
    }
  }, [open, ticketId, refreshKey])

  if (!open) {
    return (
      <button type="button" className="secondary history-toggle" onClick={() => setOpen(true)}>
        変更履歴を表示
      </button>
    )
  }

  return (
    <section aria-labelledby="history-heading" className="history">
      <h2 id="history-heading">変更履歴</h2>
      {loadError ? (
        <p role="alert">変更履歴を取得できませんでした</p>
      ) : events === null ? (
        <p>読み込み中…</p>
      ) : events.length === 0 ? (
        <p className="empty">まだ履歴はありません</p>
      ) : (
        <ul>
          {events.map((event) => (
            <li key={event.id}>
              <span className="who">{event.user.name}</span>
              <span className="what">{describe(event)}</span>
              <time dateTime={event.created_at}>
                {new Date(event.created_at).toLocaleString('ja-JP', { dateStyle: 'short', timeStyle: 'short' })}
              </time>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
