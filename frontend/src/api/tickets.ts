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

export type TicketItemKind = 'confirmed' | 'unknown' | 'assumption'

export type TicketItem = {
  id: number
  ticket_id: number
  kind: TicketItemKind
  body: string
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export type TicketDetail = Ticket & {
  items: TicketItem[]
}

export type TicketItemInput = {
  kind: TicketItemKind
  body: string
}

export const STATUS_LABELS: Record<TicketStatus, string> = {
  investigating: '調査中',
  in_review: 'レビュー中',
  done: '完了',
}

// 画面に並べる順。レビュー前に潰したい不明点を先頭にする
export const ITEM_KINDS: TicketItemKind[] = ['unknown', 'assumption', 'confirmed']

export const ITEM_KIND_LABELS: Record<TicketItemKind, string> = {
  unknown: '不明点',
  assumption: '仮定',
  confirmed: '確認済み',
}

// 422のときに、APIが返したエラーメッセージを画面に渡すための例外
export class ValidationError extends Error {
  messages: string[]

  constructor(messages: string[]) {
    super(messages.join(', '))
    this.messages = messages
  }
}

export class NotFoundError extends Error {}

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

export async function fetchTicket(id: string): Promise<TicketDetail> {
  const url = `${TICKETS_URL}/${id}`
  const response = await fetch(url)
  if (response.status === 404) {
    throw new NotFoundError()
  }
  if (!response.ok) {
    throw new Error(`GET ${url} failed: ${response.status}`)
  }
  return response.json()
}

export async function createTicketItem(ticketId: number, input: TicketItemInput): Promise<TicketItem> {
  const url = `${TICKETS_URL}/${ticketId}/items`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ item: input }),
  })
  if (response.status === 422) {
    const body: { errors: string[] } = await response.json()
    throw new ValidationError(body.errors)
  }
  if (!response.ok) {
    throw new Error(`POST ${url} failed: ${response.status}`)
  }
  return response.json()
}
