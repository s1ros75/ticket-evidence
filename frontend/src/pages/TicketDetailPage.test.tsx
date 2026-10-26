import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import App from '../App'
import type { User } from '../api/session'
import { CurrentUserContext } from '../auth/CurrentUserContext'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const member: User = { id: 1, name: '担当者', email: 'member@example.com', role: 'member' }
const reviewer: User = { id: 2, name: 'レビュアー', email: 'reviewer@example.com', role: 'reviewer' }

function renderDetail(id = 1, user: User = member) {
  return render(
    <CurrentUserContext.Provider value={user}>
      <MemoryRouter initialEntries={[`/tickets/${id}`]}>
        <App />
      </MemoryRouter>
    </CurrentUserContext.Provider>,
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

describe('レビュー依頼', () => {
  it('不明点が残っていれば、ボタンを押せず、残数を表示する', async () => {
    const items = [item(1, 'unknown', '締め切りはいつか'), item(2, 'unknown', '支払い方法は何があるか')]
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ...ticket, items })))

    renderDetail()

    expect(await screen.findByRole('button', { name: 'レビュー依頼に進む' })).toBeDisabled()
    expect(screen.getByText('不明点が2件残っています。すべて解決するとレビュー依頼に進めます')).toBeInTheDocument()
  })

  it('不明点がなければレビュー依頼に進み、ステータスがレビュー中になる', async () => {
    const items = [item(1, 'confirmed', '対象はWeb版のみ'), item(2, 'assumption', '既存の会員情報を使う')]
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ...ticket, items }))
      .mockResolvedValueOnce(jsonResponse({ ...ticket, status: 'in_review', items: undefined }))
    vi.stubGlobal('fetch', fetchMock)

    renderDetail()
    fireEvent.click(await screen.findByRole('button', { name: 'レビュー依頼に進む' }))

    expect(await screen.findByText('レビュー中')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'レビュー依頼に進む' })).not.toBeInTheDocument()
    expect(screen.getByText('対象はWeb版のみ')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenLastCalledWith('/api/v1/tickets/1/request_review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
  })

  it('APIに断られたときは、返されたエラーを表示する', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ ...ticket, items: [] }))
        .mockResolvedValueOnce(
          jsonResponse({ errors: ['不明点が1件残っているため、レビュー依頼に進めません'] }, 422),
        ),
    )

    renderDetail()
    fireEvent.click(await screen.findByRole('button', { name: 'レビュー依頼に進む' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('不明点が1件残っているため、レビュー依頼に進めません')
    expect(screen.getByText('調査中')).toBeInTheDocument()
  })

  it('調査中でなければ、レビュー依頼のボタンを出さない', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ...ticket, status: 'in_review' })))

    renderDetail()

    expect(await screen.findByText('レビュー中')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'レビュー依頼に進む' })).not.toBeInTheDocument()
  })
})

describe('レビュー', () => {
  const inReview = { ...ticket, status: 'in_review', items: [item(2, 'confirmed', '対象はWeb版のみ')] }

  it('レビュー中なら、完了と差し戻しのボタンを出し、レビュー依頼のボタンは出さない', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(inReview)))

    renderDetail(1, reviewer)

    expect(await screen.findByRole('button', { name: '完了にする' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '差し戻す' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'レビュー依頼に進む' })).not.toBeInTheDocument()
  })

  it('完了にすると、ステータスが完了になり、レビューのボタンが消える', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(inReview))
      .mockResolvedValueOnce(jsonResponse({ ...inReview, status: 'done', items: undefined }))
    vi.stubGlobal('fetch', fetchMock)

    renderDetail(1, reviewer)
    fireEvent.click(await screen.findByRole('button', { name: '完了にする' }))

    expect(await screen.findByText('完了')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '差し戻す' })).not.toBeInTheDocument()
    expect(screen.getByText('対象はWeb版のみ')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenLastCalledWith('/api/v1/tickets/1/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
  })

  it('理由を付けて差し戻すと、調査中に戻り、理由が不明点に入る', async () => {
    const sentBack = {
      ...inReview,
      status: 'investigating',
      items: [...inReview.items, item(3, 'unknown', '退会時のデータの扱いが書かれていない')],
    }
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(inReview)).mockResolvedValueOnce(jsonResponse(sentBack))
    vi.stubGlobal('fetch', fetchMock)

    renderDetail(1, reviewer)
    fireEvent.click(await screen.findByRole('button', { name: '差し戻す' }))
    fireEvent.change(screen.getByLabelText('差し戻しの理由'), {
      target: { value: '退会時のデータの扱いが書かれていない' },
    })
    fireEvent.click(screen.getByRole('button', { name: '理由を付けて差し戻す' }))

    const unknowns = screen.getByRole('region', { name: '不明点' })
    expect(await within(unknowns).findByText('退会時のデータの扱いが書かれていない')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'レビュー依頼に進む' })).toBeDisabled()
    expect(screen.queryByRole('button', { name: '完了にする' })).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenLastCalledWith('/api/v1/tickets/1/send_back', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: '退会時のデータの扱いが書かれていない' }),
    })
  })

  it('差し戻しに失敗したときは、APIが返したエラーを表示する', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse(inReview))
        .mockResolvedValueOnce(jsonResponse({ errors: ['差し戻しの理由を入力してください'] }, 422)),
    )

    renderDetail(1, reviewer)
    fireEvent.click(await screen.findByRole('button', { name: '差し戻す' }))
    fireEvent.click(screen.getByRole('button', { name: '理由を付けて差し戻す' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('差し戻しの理由を入力してください')
    expect(screen.getByText('レビュー中')).toBeInTheDocument()
  })

  it('完了したチケットには、レビューのボタンを出さない', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ ...inReview, status: 'done' })))

    renderDetail(1, reviewer)

    expect(await screen.findByText('完了')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '完了にする' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '差し戻す' })).not.toBeInTheDocument()
  })

  it('担当者には、完了と差し戻しのボタンを出さず、確認待ちと表示する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(inReview)))

    renderDetail(1, member)

    expect(await screen.findByText('レビュアーの確認待ちです')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '完了にする' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '差し戻す' })).not.toBeInTheDocument()
  })
})

describe('変更履歴', () => {
  const events = [
    {
      id: 3,
      action: 'item_resolved',
      details: {
        item_id: 1,
        body: '締め切りはいつか',
        kind: ['unknown', 'confirmed'],
        evidence: { url: null, memo: '11月末と確認' },
      },
      created_at: '2026-10-21T12:00:00Z',
      user: { id: 1, name: '佐藤' },
    },
    {
      id: 2,
      action: 'item_added',
      details: { item_id: 1, kind: 'unknown', body: '締め切りはいつか' },
      created_at: '2026-10-21T11:00:00Z',
      user: { id: 1, name: '佐藤' },
    },
    {
      id: 1,
      action: 'ticket_created',
      details: { title: '会員登録の要件確認' },
      created_at: '2026-10-21T10:00:00Z',
      user: { id: 2, name: '鈴木' },
    },
  ]

  it('ボタンを押すと、変更履歴を新しい順に、操作した人と内容つきで表示する', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse(ticket)).mockResolvedValueOnce(jsonResponse(events))
    vi.stubGlobal('fetch', fetchMock)

    renderDetail()
    fireEvent.click(await screen.findByRole('button', { name: '変更履歴を表示' }))

    const history = await screen.findByRole('region', { name: '変更履歴' })
    const rows = await within(history).findAllByRole('listitem')
    expect(rows.map((row) => row.textContent)).toEqual([
      expect.stringContaining('佐藤不明点を解決：締め切りはいつか（根拠：11月末と確認）'),
      expect.stringContaining('佐藤不明点を追加：締め切りはいつか'),
      expect.stringContaining('鈴木チケットを作成：会員登録の要件確認'),
    ])
    expect(fetchMock).toHaveBeenLastCalledWith('/api/v1/tickets/1/events')
  })

  it('ステータスの変更は、変更前後と理由を表示する', async () => {
    const statusEvents = [
      {
        id: 2,
        action: 'sent_back',
        details: { status: ['in_review', 'investigating'], reason: '退会時の扱いが不明' },
        created_at: '2026-10-21T11:00:00Z',
        user: { id: 2, name: '鈴木' },
      },
      {
        id: 1,
        action: 'review_requested',
        details: { status: ['investigating', 'in_review'] },
        created_at: '2026-10-21T10:00:00Z',
        user: { id: 1, name: '佐藤' },
      },
    ]
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValueOnce(jsonResponse(ticket)).mockResolvedValueOnce(jsonResponse(statusEvents)),
    )

    renderDetail()
    fireEvent.click(await screen.findByRole('button', { name: '変更履歴を表示' }))

    const rows = await within(await screen.findByRole('region', { name: '変更履歴' })).findAllByRole('listitem')
    expect(rows[0]).toHaveTextContent('差し戻し（レビュー中 → 調査中）：退会時の扱いが不明')
    expect(rows[1]).toHaveTextContent('レビュー依頼（調査中 → レビュー中）')
  })

  it('履歴を開いているときに操作すると、履歴を読み直す', async () => {
    const added = { ...item(4, 'unknown', '支払い方法は何があるか') }
    const addedEvent = {
      id: 9,
      action: 'item_added',
      details: { item_id: 4, kind: 'unknown', body: '支払い方法は何があるか' },
      created_at: '2026-10-21T13:00:00Z',
      user: { id: 1, name: '佐藤' },
    }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ...ticket, items: [] }))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse(added, 201))
      .mockResolvedValueOnce(jsonResponse([addedEvent]))
    vi.stubGlobal('fetch', fetchMock)

    renderDetail()
    fireEvent.click(await screen.findByRole('button', { name: '変更履歴を表示' }))
    const history = await screen.findByRole('region', { name: '変更履歴' })
    await within(history).findByText('まだ履歴はありません')

    fireEvent.change(screen.getByLabelText('内容'), { target: { value: '支払い方法は何があるか' } })
    fireEvent.click(screen.getByRole('button', { name: '追加' }))

    expect(await within(history).findByText(/不明点を追加：支払い方法は何があるか/)).toBeInTheDocument()
  })
})
