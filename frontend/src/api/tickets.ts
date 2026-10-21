export type TicketStatus = 'investigating' | 'in_review' | 'done'

export type Ticket = {
  id: number
  title: string
  description: string | null
  status: TicketStatus
  created_at: string
  updated_at: string
}

export type TicketInput = {
  title: string
  description: string
}

export const STATUS_LABELS: Record<TicketStatus, string> = {
  investigating: '調査中',
  in_review: 'レビュー中',
  done: '完了',
}

// 422のときに、APIが返したエラーメッセージを画面に渡すための例外
export class ValidationError extends Error {
  messages: string[]

  constructor(messages: string[]) {
    super(messages.join(', '))
    this.messages = messages
  }
}

const TICKETS_URL = '/api/v1/tickets'

export async function fetchTickets(): Promise<Ticket[]> {
  const response = await fetch(TICKETS_URL)
  if (!response.ok) {
    throw new Error(`GET ${TICKETS_URL} failed: ${response.status}`)
  }
  return response.json()
}

export async function createTicket(input: TicketInput): Promise<Ticket> {
  const response = await fetch(TICKETS_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticket: input }),
  })
  if (response.status === 422) {
    const body: { errors: string[] } = await response.json()
    throw new ValidationError(body.errors)
  }
  if (!response.ok) {
    throw new Error(`POST ${TICKETS_URL} failed: ${response.status}`)
  }
  return response.json()
}
