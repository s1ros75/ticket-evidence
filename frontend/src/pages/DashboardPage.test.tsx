import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import App from '../App'
import { CurrentUserContext } from '../auth/CurrentUserContext'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const member = { id: 1, name: '佐藤', email: 'member@example.com', role: 'member' } as const

function renderDashboard() {
  return render(
    <CurrentUserContext.Provider value={member}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <App />
      </MemoryRouter>
    </CurrentUserContext.Provider>,
  )
}

const dashboard = {
  status_counts: { investigating: 4, in_review: 1, done: 7 },
  investigating_with_unknowns: 3,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ダッシュボード', () => {
  it('ステータス別の件数と、不明点が残る調査中の件数を表示する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(dashboard)))

    renderDashboard()

    expect(await screen.findByRole('link', { name: '調査中 4件' })).toHaveAttribute('href', '/?status=investigating')
    expect(screen.getByRole('link', { name: 'レビュー中 1件' })).toHaveAttribute('href', '/?status=in_review')
    expect(screen.getByRole('link', { name: '完了 7件' })).toHaveAttribute('href', '/?status=done')
    expect(screen.getByRole('link', { name: 'うち不明点が残る 3件' })).toHaveAttribute('href', '/?status=investigating')
    expect(fetch).toHaveBeenCalledWith('/api/v1/dashboard')
  })

  it('タイルを押すと、そのステータスで絞り込んだ一覧に移る', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(dashboard)).mockResolvedValueOnce(jsonResponse([]))
    vi.stubGlobal('fetch', fetchMock)

    renderDashboard()
    fireEvent.click(await screen.findByRole('link', { name: '完了 7件' }))

    expect(await screen.findByText('チケットはまだありません')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenLastCalledWith('/api/v1/tickets?status=done')
  })

  it('取得に失敗したら、エラーを表示する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 500)))

    renderDashboard()

    expect(await screen.findByRole('alert')).toHaveTextContent('ダッシュボードを取得できませんでした')
  })
})
