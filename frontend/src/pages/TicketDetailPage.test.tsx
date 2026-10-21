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
    evidences: [],
  }
}

function evidence(id: number, url: string | null, memo: string | null) {
  return {
    id,
    ticket_item_id: 1,
    url,
    memo,
    created_at: '2026-10-21T12:00:00Z',
    updated_at: '2026-10-21T12:00:00Z',
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

describe('項目の解決', () => {
  it('解決済みの項目には、根拠と解決日を表示する', async () => {
    const resolved = {
      ...item(1, 'confirmed', '締め切りは11月末'),
      resolved_at: '2026-10-21T12:00:00Z',
      evidences: [evidence(1, 'https://example.com/minutes/1', '打ち合わせで確認')],
    }
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ...ticket, items: [resolved] })))

    renderDetail()

    const confirmed = await screen.findByRole('region', { name: '確認済み' })
    expect(within(confirmed).getByRole('link', { name: 'https://example.com/minutes/1' })).toHaveAttribute(
      'href',
      'https://example.com/minutes/1',
    )
    expect(within(confirmed).getByText('打ち合わせで確認')).toBeInTheDocument()
    expect(within(confirmed).getByText(/2026\/10\/21に解決/)).toBeInTheDocument()
  })

  it('確認済みの項目には、解決するボタンを出さない', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(ticket)))

    renderDetail()

    const confirmed = await screen.findByRole('region', { name: '確認済み' })
    expect(within(confirmed).queryByRole('button', { name: '解決する' })).not.toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: '不明点' })).getByRole('button', { name: '解決する' })).toBeInTheDocument()
    expect(within(screen.getByRole('region', { name: '仮定' })).getByRole('button', { name: '解決する' })).toBeInTheDocument()
  })

  it('根拠を付けて解決すると、項目が確認済みの欄へ移る', async () => {
    const resolved = {
      ...item(1, 'confirmed', '締め切りはいつか'),
      resolved_at: '2026-10-21T12:00:00Z',
      evidences: [evidence(1, null, '11月末と顧客に確認した')],
    }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(ticket))
      .mockResolvedValueOnce(jsonResponse(resolved))
    vi.stubGlobal('fetch', fetchMock)

    renderDetail()
    const unknowns = await screen.findByRole('region', { name: '不明点' })

    fireEvent.click(within(unknowns).getByRole('button', { name: '解決する' }))
    fireEvent.change(within(unknowns).getByLabelText('メモ'), { target: { value: '11月末と顧客に確認した' } })
    fireEvent.click(within(unknowns).getByRole('button', { name: '根拠を付けて解決' }))

    const confirmed = screen.getByRole('region', { name: '確認済み' })
    expect(await within(confirmed).findByText('締め切りはいつか')).toBeInTheDocument()
    expect(within(confirmed).getByText('11月末と顧客に確認した')).toBeInTheDocument()
    expect(within(unknowns).queryByText('締め切りはいつか')).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenLastCalledWith('/api/v1/tickets/1/items/1/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ evidence: { url: '', memo: '11月末と顧客に確認した' } }),
    })
  })

  it('根拠が空のときは、APIが返したエラーを表示する', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(ticket))
        .mockResolvedValueOnce(jsonResponse({ errors: ['リンクかメモのどちらかを入力してください'] }, 422)),
    )

    renderDetail()
    const unknowns = await screen.findByRole('region', { name: '不明点' })

    fireEvent.click(within(unknowns).getByRole('button', { name: '解決する' }))
    fireEvent.click(within(unknowns).getByRole('button', { name: '根拠を付けて解決' }))

    expect(await within(unknowns).findByRole('alert')).toHaveTextContent('リンクかメモのどちらかを入力してください')
    expect(within(unknowns).getByText('締め切りはいつか')).toBeInTheDocument()
  })
})
