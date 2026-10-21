import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import App from '../App'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function renderDetail(id = 1) {
  return render(
    <MemoryRouter initialEntries={[`/tickets/${id}`]}>
      <App />
    </MemoryRouter>,
  )
}

function item(id: number, kind: string, body: string) {
  return {
    id,
    ticket_id: 1,
    kind,
    body,
    resolved_at: null,
    created_at: '2026-10-21T10:00:00Z',
    updated_at: '2026-10-21T10:00:00Z',
  }
}

const ticket = {
  id: 1,
  title: '会員登録の要件確認',
  description: '顧客からの要望を整理する',
  status: 'investigating',
  created_at: '2026-10-20T10:00:00Z',
  updated_at: '2026-10-20T10:00:00Z',
  items: [
    item(1, 'unknown', '締め切りはいつか'),
    item(2, 'confirmed', '対象はWeb版のみ'),
    item(3, 'assumption', '既存の会員情報を使う'),
  ],
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('チケット詳細', () => {
  it('チケットの内容と、項目を種別ごとに分けて表示する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(ticket)))

    renderDetail()

    expect(await screen.findByRole('heading', { level: 1, name: '会員登録の要件確認' })).toBeInTheDocument()
    expect(screen.getByText('顧客からの要望を整理する')).toBeInTheDocument()
    expect(screen.getByText('調査中')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith('/api/v1/tickets/1')

    expect(within(screen.getByRole('region', { name: '不明点' })).getByText('締め切りはいつか')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: '確認済み' })).getByText('対象はWeb版のみ')).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: '仮定' })).getByText('既存の会員情報を使う')).toBeInTheDocument()
  })

  it('項目がない種別には、その旨を表示する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ...ticket, items: [] })))

    renderDetail()

    const unknowns = await screen.findByRole('region', { name: '不明点' })
    expect(within(unknowns).getByText('まだありません')).toBeInTheDocument()
  })

  it('存在しないチケットなら、見つからないと表示する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ errors: ['Not found'] }, 404)))

    renderDetail(999)

    expect(await screen.findByRole('alert')).toHaveTextContent('チケットが見つかりません')
  })
})

describe('項目の追加', () => {
  it('追加した項目を、選んだ種別の欄に表示する', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ...ticket, items: [] }))
      .mockResolvedValueOnce(jsonResponse(item(4, 'unknown', '支払い方法は何があるか'), 201))
    vi.stubGlobal('fetch', fetchMock)

    renderDetail()
    await screen.findByRole('region', { name: '不明点' })

    fireEvent.change(screen.getByLabelText('種別'), { target: { value: 'unknown' } })
    fireEvent.change(screen.getByLabelText('内容'), { target: { value: '支払い方法は何があるか' } })
    fireEvent.click(screen.getByRole('button', { name: '追加' }))

    const unknowns = screen.getByRole('region', { name: '不明点' })
    expect(await within(unknowns).findByText('支払い方法は何があるか')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenLastCalledWith('/api/v1/tickets/1/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item: { kind: 'unknown', body: '支払い方法は何があるか' } }),
    })
    expect(screen.getByLabelText('内容')).toHaveValue('')
  })

  it('検証エラーのときは、APIが返したエラーを表示する', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ ...ticket, items: [] }))
        .mockResolvedValueOnce(jsonResponse({ errors: ["Body can't be blank"] }, 422)),
    )

    renderDetail()
    await screen.findByRole('region', { name: '不明点' })

    fireEvent.click(screen.getByRole('button', { name: '追加' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("Body can't be blank")
  })
})
