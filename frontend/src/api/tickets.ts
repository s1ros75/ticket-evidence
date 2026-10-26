import { getJson, postJson } from './client'

// 画面側はこれまでどおり tickets から読み込めるようにする
export { NotFoundError, ValidationError } from './client'

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

const TICKETS_URL = '/api/v1/tickets'

export function fetchTickets(status?: TicketStatus): Promise<TicketSummary[]> {
  return getJson(status ? `${TICKETS_URL}?${new URLSearchParams({ status })}` : TICKETS_URL)
}

export function createTicket(input: TicketInput): Promise<Ticket> {
  return postJson(TICKETS_URL, { ticket: input })
}

export function fetchTicket(id: string): Promise<TicketDetail> {
  return getJson(`${TICKETS_URL}/${id}`)
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

export function approveTicket(ticketId: number): Promise<Ticket> {
  return postJson(`${TICKETS_URL}/${ticketId}/approve`, {})
}

// 差し戻すと理由が不明点として増えるので、項目を含めた詳細が返る
export function sendBackTicket(ticketId: number, reason: string): Promise<TicketDetail> {
  return postJson(`${TICKETS_URL}/${ticketId}/send_back`, { reason })
}

type StatusChange = [TicketStatus, TicketStatus]

type EventBase = {
  id: number
  created_at: string
  user: { id: number; name: string }
}

// 操作ごとに details の中身が違うので、action で見分けられる型にしておく
export type TicketEvent = EventBase &
  (
    | { action: 'ticket_created'; details: { title: string } }
    | { action: 'item_added'; details: { item_id: number; kind: TicketItemKind; body: string } }
    | {
        action: 'item_resolved'
        details: {
          item_id: number
          body: string
          kind: [TicketItemKind, TicketItemKind]
          evidence: { url: string | null; memo: string | null }
        }
      }
    | { action: 'review_requested'; details: { status: StatusChange } }
    | { action: 'approved'; details: { status: StatusChange } }
    | { action: 'sent_back'; details: { status: StatusChange; reason: string } }
  )

export function fetchTicketEvents(ticketId: number): Promise<TicketEvent[]> {
  return getJson(`${TICKETS_URL}/${ticketId}/events`)
}
