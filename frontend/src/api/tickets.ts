export type TicketStatus = 'investigating' | 'in_review' | 'done'

export type Ticket = {
  id: number
  title: string
  description: string | null
  status: TicketStatus
  created_at: string
  updated_at: string
}

// 一覧APIは、残っている不明点の数も一緒に返す
export type TicketSummary = Ticket & {
  unknown_count: number
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
  evidences: Evidence[]
}

export type Evidence = {
  id: number
  ticket_item_id: number
  url: string | null
  memo: string | null
  created_at: string
  updated_at: string
}

export type EvidenceInput = {
  url: string
  memo: string
}

export type TicketDetail = Ticket & {
  items: TicketItem[]
}

export type TicketItemInput = {
  kind: TicketItemKind
  body: string
}

export const TICKET_STATUSES: TicketStatus[] = ['investigating', 'in_review', 'done']

export function isTicketStatus(value: string | null): value is TicketStatus {
  return TICKET_STATUSES.includes(value as TicketStatus)
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

export async function fetchTickets(status?: TicketStatus): Promise<TicketSummary[]> {
  const url = status ? `${TICKETS_URL}?${new URLSearchParams({ status })}` : TICKETS_URL
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`GET ${url} failed: ${response.status}`)
  }
  return response.json()
}

// POSTして、422ならAPIが返したエラーメッセージをValidationErrorとして投げる
async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (response.status === 422) {
    const errorBody: { errors: string[] } = await response.json()
    throw new ValidationError(errorBody.errors)
  }
  if (!response.ok) {
    throw new Error(`POST ${url} failed: ${response.status}`)
  }
  return response.json()
}

export function createTicket(input: TicketInput): Promise<Ticket> {
  return postJson(TICKETS_URL, { ticket: input })
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

export function createTicketItem(ticketId: number, input: TicketItemInput): Promise<TicketItem> {
  return postJson(`${TICKETS_URL}/${ticketId}/items`, { item: input })
}

export function resolveTicketItem(ticketId: number, itemId: number, input: EvidenceInput): Promise<TicketItem> {
  return postJson(`${TICKETS_URL}/${ticketId}/items/${itemId}/resolve`, { evidence: input })
}

export function requestTicketReview(ticketId: number): Promise<Ticket> {
  return postJson(`${TICKETS_URL}/${ticketId}/request_review`, {})
}
