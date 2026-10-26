import { useEffect, useState } from 'react'
import { fetchTickets, type Ticket, type TicketSummary } from '../api/tickets'
import { TicketForm } from '../components/TicketForm'
import { TicketList } from '../components/TicketList'

export function TicketsPage() {
  const [tickets, setTickets] = useState<TicketSummary[] | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    fetchTickets()
      .then(setTickets)
      .catch(() => setLoadError(true))
  }, [])

  // 作成したばかりのチケットには項目がないので、不明点は0件
  function handleCreated(ticket: Ticket) {
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
