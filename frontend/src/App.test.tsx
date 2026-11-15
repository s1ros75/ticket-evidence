import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import App from './App'
import { CurrentUserContext } from './auth/CurrentUserContext'

const member = { id: 1, name: '担当者', email: 'member@example.com', role: 'member', admin: false, organization: { id: 1, name: '株式会社サンプル' } } as const

function renderApp(path = '/') {
  return render(
    <CurrentUserContext.Provider value={member}>
      <MemoryRouter initialEntries={[path]}>
        <App />
      </MemoryRouter>
    </CurrentUserContext.Provider>,
  )
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

// チケット一覧APIの応答（50件ずつ返し、続きがあれば next_cursor が入る）
function listResponse(tickets: unknown[], nextCursor: string | null = null) {
  return jsonResponse({ tickets, next_cursor: nextCursor })
}

const existingTicket = {
  id: 1,
  title: '既存のチケット',
  description: null,
  status: 'investigating',
  created_at: '2026-10-20T10:00:00Z',
  updated_at: '2026-10-20T10:00:00Z',
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('チケット一覧', () => {
  it('APIから取得したチケットを、ステータスと一緒に表示する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(listResponse([existingTicket])))

    renderApp()

    expect(await screen.findByText('既存のチケット')).toBeInTheDocument()
    expect(within(screen.getByRole('listitem')).getByText('調査中')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith('/api/v1/tickets')
  })

  it('チケットが無いときは、その旨を表示する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(listResponse([])))

    renderApp()

    expect(await screen.findByText('チケットはまだありません')).toBeInTheDocument()
  })

  it('一覧の取得に失敗したら、エラーを表示する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 500)))

    renderApp()

    expect(await screen.findByRole('alert')).toHaveTextContent('一覧を取得できませんでした')
  })
})

describe('一覧の続き', () => {
  const olderTicket = { ...existingTicket, id: 2, title: '古いチケット' }

  it('続きがあれば「さらに表示」を出し、押すと続きを一覧の下に足す', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(listResponse([existingTicket], 'cursor-1'))
      .mockResolvedValueOnce(listResponse([olderTicket]))
    vi.stubGlobal('fetch', fetchMock)

    renderApp()
    fireEvent.click(await screen.findByRole('button', { name: 'さらに表示' }))

    expect(await screen.findByText('古いチケット')).toBeInTheDocument()
    expect(screen.getAllByRole('listitem').map((item) => item.querySelector('a')?.textContent)).toEqual([
      '既存のチケット',
      '古いチケット',
    ])
    expect(fetchMock).toHaveBeenLastCalledWith('/api/v1/tickets?cursor=cursor-1')
    // 最後のページなので、もうボタンは出さない
    expect(screen.queryByRole('button', { name: 'さらに表示' })).not.toBeInTheDocument()
  })

  it('続きがなければ「さらに表示」を出さない', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(listResponse([existingTicket])))

    renderApp()

    await screen.findByText('既存のチケット')
    expect(screen.queryByRole('button', { name: 'さらに表示' })).not.toBeInTheDocument()
  })

  it('絞り込んでいるときは、続きも同じ絞り込みで取得する', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(listResponse([{ ...existingTicket, status: 'done' }], 'cursor-1'))
      .mockResolvedValueOnce(listResponse([{ ...olderTicket, status: 'done' }]))
    vi.stubGlobal('fetch', fetchMock)

    renderApp('/?status=done')
    fireEvent.click(await screen.findByRole('button', { name: 'さらに表示' }))

    await screen.findByText('古いチケット')
    expect(fetchMock).toHaveBeenLastCalledWith('/api/v1/tickets?status=done&cursor=cursor-1')
  })

  it('続きを読み込んでいる間に絞り込みを変えたら、届いた続きを新しい一覧に混ぜない', async () => {
    let resolveMore: (response: Response) => void = () => {}
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(listResponse([existingTicket], 'cursor-1'))
      .mockReturnValueOnce(new Promise<Response>((resolve) => (resolveMore = resolve)))
      .mockResolvedValueOnce(listResponse([{ ...existingTicket, id: 3, title: '完了したチケット', status: 'done' }]))
    vi.stubGlobal('fetch', fetchMock)

    renderApp()
    fireEvent.click(await screen.findByRole('button', { name: 'さらに表示' }))
    fireEvent.change(screen.getByLabelText('ステータス'), { target: { value: 'done' } })
    await screen.findByText('完了したチケット')

    resolveMore(listResponse([olderTicket]))

    await waitFor(() => expect(screen.getAllByRole('listitem')).toHaveLength(1))
    expect(screen.queryByText('古いチケット')).not.toBeInTheDocument()
  })

  it('続きの取得に失敗したら、それまでの一覧を残したままエラーを出し、もう一度押せる', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(listResponse([existingTicket], 'cursor-1'))
        .mockResolvedValueOnce(jsonResponse({}, 500)),
    )

    renderApp()
    fireEvent.click(await screen.findByRole('button', { name: 'さらに表示' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('続きを取得できませんでした')
    expect(screen.getByText('既存のチケット')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'さらに表示' })).toBeEnabled()
  })
})

describe('チケット作成フォーム', () => {
  it('作成したチケットを、一覧の先頭に追加する', async () => {
    const created = { ...existingTicket, id: 2, title: '新しいチケット', description: '概要' }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(listResponse([existingTicket]))
      .mockResolvedValueOnce(jsonResponse(created, 201))
    vi.stubGlobal('fetch', fetchMock)

    renderApp()
    await screen.findByText('既存のチケット')

    fireEvent.change(screen.getByLabelText('タイトル'), { target: { value: '新しいチケット' } })
    fireEvent.change(screen.getByLabelText('概要'), { target: { value: '概要' } })
    fireEvent.click(screen.getByRole('button', { name: '作成' }))

    await screen.findByText('新しいチケット')
    const titles = screen.getAllByRole('listitem').map((item) => item.textContent)
    expect(titles[0]).toContain('新しいチケット')
    expect(titles[1]).toContain('既存のチケット')

    expect(fetchMock).toHaveBeenLastCalledWith('/api/v1/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ticket: { title: '新しいチケット', description: '概要' } }),
    })
    expect(screen.getByLabelText('タイトル')).toHaveValue('')
  })

  it('検証エラーのときは、APIが返したエラーを表示する', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(listResponse([]))
        .mockResolvedValueOnce(jsonResponse({ errors: ["Title can't be blank"] }, 422)),
    )

    renderApp()
    await screen.findByText('チケットはまだありません')

    fireEvent.click(screen.getByRole('button', { name: '作成' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("Title can't be blank")
  })
})

describe('一覧から詳細へ', () => {
  it('チケットのタイトルを押すと、詳細画面に移る', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(listResponse([existingTicket]))
      .mockResolvedValueOnce(jsonResponse({ ...existingTicket, items: [] }))
    vi.stubGlobal('fetch', fetchMock)

    renderApp()
    fireEvent.click(await screen.findByRole('link', { name: '既存のチケット' }))

    expect(await screen.findByRole('heading', { level: 1, name: '既存のチケット' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenLastCalledWith('/api/v1/tickets/1')
  })
})

describe('一覧の不明点の残数', () => {
  it('不明点が残っていれば件数を、なければ「不明点なし」を表示する', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        listResponse([
          { ...existingTicket, id: 1, title: '不明点があるチケット', unknown_count: 2 },
          { ...existingTicket, id: 2, title: '不明点がないチケット', unknown_count: 0 },
        ]),
      ),
    )

    renderApp()

    await screen.findByText('不明点があるチケット')
    const [withUnknowns, withoutUnknowns] = screen.getAllByRole('listitem')
    expect(withUnknowns).toHaveTextContent('不明点 2件')
    expect(withoutUnknowns).toHaveTextContent('不明点なし')
  })

  it('作成したばかりのチケットは「不明点なし」と表示する', async () => {
    const created = { ...existingTicket, id: 2, title: '新しいチケット' }
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(listResponse([]))
        .mockResolvedValueOnce(jsonResponse(created, 201)),
    )

    renderApp()
    await screen.findByText('チケットはまだありません')

    fireEvent.change(screen.getByLabelText('タイトル'), { target: { value: '新しいチケット' } })
    fireEvent.click(screen.getByRole('button', { name: '作成' }))

    expect(await screen.findByRole('listitem')).toHaveTextContent('不明点なし')
  })
})

describe('一覧の絞り込み', () => {
  it('ステータスを選ぶと、そのステータスで絞り込んだ一覧を取得する', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(listResponse([existingTicket]))
      .mockResolvedValueOnce(listResponse([{ ...existingTicket, id: 2, title: '完了したチケット', status: 'done' }]))
    vi.stubGlobal('fetch', fetchMock)

    renderApp()
    await screen.findByText('既存のチケット')

    fireEvent.change(screen.getByLabelText('ステータス'), { target: { value: 'done' } })

    expect(await screen.findByText('完了したチケット')).toBeInTheDocument()
    expect(screen.queryByText('既存のチケット')).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenLastCalledWith('/api/v1/tickets?status=done')
  })

  it('URLで指定したステータスで、最初から絞り込む', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(listResponse([])))

    renderApp('/?status=in_review')

    await screen.findByText('チケットはまだありません')
    expect(fetch).toHaveBeenCalledWith('/api/v1/tickets?status=in_review')
    expect(screen.getByLabelText('ステータス')).toHaveValue('in_review')
  })

  it('知らないステータスがURLにあれば、絞り込まずに取得する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(listResponse([])))

    renderApp('/?status=unknown')

    await screen.findByText('チケットはまだありません')
    expect(fetch).toHaveBeenCalledWith('/api/v1/tickets')
    expect(screen.getByLabelText('ステータス')).toHaveValue('')
  })

  it('完了で絞り込んでいるときに作成したチケットは、一覧に足さない', async () => {
    const created = { ...existingTicket, id: 2, title: '新しいチケット' }
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(listResponse([]))
        .mockResolvedValueOnce(jsonResponse(created, 201)),
    )

    renderApp('/?status=done')
    await screen.findByText('チケットはまだありません')

    fireEvent.change(screen.getByLabelText('タイトル'), { target: { value: '新しいチケット' } })
    fireEvent.click(screen.getByRole('button', { name: '作成' }))

    await waitFor(() => expect(screen.getByLabelText('タイトル')).toHaveValue(''))
    expect(screen.queryByText('新しいチケット')).not.toBeInTheDocument()
  })
})

