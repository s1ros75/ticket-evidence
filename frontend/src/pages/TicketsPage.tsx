import { useEffect, useState } from 'react'
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

  useEffect(() => {
    // 絞り込みを続けて切り替えたときに、古い応答で上書きしないようにする
    let ignore = false
    fetchTickets(status)
      .then((result) => {
        if (ignore) return
        setTickets(result)
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

  // 作成したばかりのチケットには項目がないので、不明点は0件
  function handleCreated(ticket: Ticket) {
    // 絞り込みに合わないチケットは、一覧に足さない
    if (status && ticket.status !== status) return
    setTickets((current) => [{ ...ticket, unknown_count: 0 }, ...(current ?? [])])
  }

  return (
    <main>
      <h1>チケット</h1>

      <section>
        <h2>新規作成</h2>
        <TicketForm onCreated={handleCreated} />
      </section>

      <section>
        <h2>一覧</h2>
        <StatusFilter value={status} onChange={handleStatusChange} />
        {loadError ? (
          <p role="alert">一覧を取得できませんでした</p>
        ) : tickets === null ? (
          <p>読み込み中…</p>
        ) : (
          <TicketList tickets={tickets} />
        )}
      </section>
    </main>
  )
}
