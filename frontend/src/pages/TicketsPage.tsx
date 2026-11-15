import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { fetchTickets, isTicketStatus, type Ticket, type TicketStatus, type TicketSummary } from '../api/tickets'
import { StatusFilter } from '../components/StatusFilter'
import { TicketForm } from '../components/TicketForm'
import { TicketList } from '../components/TicketList'

export function TicketsPage() {
  // 絞り込みはURLに持たせ、リロードやURLの共有でも同じ一覧を出せるようにする
  const [searchParams, setSearchParams] = useSearchParams()
  const statusParam = searchParams.get('status')
  const status = isTicketStatus(statusParam) ? statusParam : undefined

  const [tickets, setTickets] = useState<TicketSummary[] | null>(null)
  const [loadError, setLoadError] = useState(false)
  // 一覧APIは50件ずつ返す。続きがあるときだけ、次を取るためのカーソルが入る
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  const [loadMoreError, setLoadMoreError] = useState(false)
  // 絞り込みを切り替えるたびに増やす。続きの応答が届いたときに、別の絞り込みの一覧へ混ぜないため
  const listVersion = useRef(0)

  // 絞り込みが変わったら、前の絞り込みの「続き」の状態を捨てる（描画中に合わせる。effectで直すと1回余分に描画される）
  const [listedStatus, setListedStatus] = useState(status)
  if (listedStatus !== status) {
    setListedStatus(status)
    setNextCursor(null)
    setLoadingMore(false)
    setLoadMoreError(false)
  }

  useEffect(() => {
    listVersion.current += 1

    // 絞り込みを続けて切り替えたときに、古い応答で上書きしないようにする
    let ignore = false
    fetchTickets(status)
      .then((page) => {
        if (ignore) return
        setTickets(page.tickets)
        setNextCursor(page.next_cursor)
        setLoadError(false)
      })
      .catch(() => {
        if (!ignore) setLoadError(true)
      })
    return () => {
      ignore = true
    }
  }, [status])

  function handleStatusChange(value: TicketStatus | undefined) {
    setSearchParams(value ? { status: value } : {})
  }

  function handleLoadMore() {
    if (!nextCursor) return
    const version = listVersion.current
    setLoadingMore(true)
    setLoadMoreError(false)
    fetchTickets(status, nextCursor)
      .then((page) => {
        if (version !== listVersion.current) return
        setTickets((current) => [...(current ?? []), ...page.tickets])
        setNextCursor(page.next_cursor)
      })
      .catch(() => {
        if (version === listVersion.current) setLoadMoreError(true)
      })
      .finally(() => {
        if (version === listVersion.current) setLoadingMore(false)
      })
  }

  // 作成したばかりのチケットには項目がないので、不明点は0件
  // 続きはカーソルより古いチケットだけを返すので、先頭に足しても続きと重ならない
  function handleCreated(ticket: Ticket) {
    // 絞り込みに合わないチケットは、一覧に足さない
    if (status && ticket.status !== status) return
    setTickets((current) => [{ ...ticket, unknown_count: 0 }, ...(current ?? [])])
  }

  return (
    <main>
      <h1>チケット</h1>

      <section className="card">
        <h2>新規作成</h2>
        <TicketForm onCreated={handleCreated} />
      </section>

      <section className="card">
        <h2>一覧</h2>
        <StatusFilter value={status} onChange={handleStatusChange} />
        {loadError ? (
          <p role="alert">一覧を取得できませんでした</p>
        ) : tickets === null ? (
          <p>読み込み中…</p>
        ) : (
          <>
            <TicketList tickets={tickets} />
            {loadMoreError && <p role="alert">続きを取得できませんでした</p>}
            {nextCursor && (
              <div className="load-more">
                <button type="button" className="secondary" disabled={loadingMore} onClick={handleLoadMore}>
                  {loadingMore ? '読み込み中…' : 'さらに表示'}
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  )
}
