import { getJson } from './client'
import type { TicketStatus } from './tickets'

export type Dashboard = {
  status_counts: Record<TicketStatus, number>
  // 調査中のうち、不明点が残っていてレビュー依頼に進めないチケットの数
  investigating_with_unknowns: number
}

export function fetchDashboard(): Promise<Dashboard> {
  return getJson('/api/v1/dashboard')
}
