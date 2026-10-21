import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import App from './App'

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
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
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([existingTicket])))

    render(<App />)

    expect(await screen.findByText('既存のチケット')).toBeInTheDocument()
    expect(screen.getByText('調査中')).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith('/api/v1/tickets')
  })

  it('チケットが無いときは、その旨を表示する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([])))

    render(<App />)

    expect(await screen.findByText('チケットはまだありません')).toBeInTheDocument()
  })

  it('一覧の取得に失敗したら、エラーを表示する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 500)))

    render(<App />)

    expect(await screen.findByRole('alert')).toHaveTextContent('一覧を取得できませんでした')
  })
})

describe('チケット作成フォーム', () => {
  it('作成したチケットを、一覧の先頭に追加する', async () => {
    const created = { ...existingTicket, id: 2, title: '新しいチケット', description: '概要' }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([existingTicket]))
      .mockResolvedValueOnce(jsonResponse(created, 201))
    vi.stubGlobal('fetch', fetchMock)

    render(<App />)
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
        .mockResolvedValueOnce(jsonResponse([]))
        .mockResolvedValueOnce(jsonResponse({ errors: ["Title can't be blank"] }, 422)),
    )

    render(<App />)
    await screen.findByText('チケットはまだありません')

    fireEvent.click(screen.getByRole('button', { name: '作成' }))

    expect(await screen.findByRole('alert')).toHaveTextContent("Title can't be blank")
  })
})
