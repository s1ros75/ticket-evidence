import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import App from '../App'
import { AuthGate } from './AuthGate'

function jsonResponse(body: unknown, status = 200) {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const member = { id: 1, name: '佐藤', email: 'member@example.com', role: 'member' }
const unauthorized = () => jsonResponse({ errors: ['ログインしてください'] }, 401)

function renderGate() {
  return render(
    <MemoryRouter>
      <AuthGate>
        <App />
      </AuthGate>
    </MemoryRouter>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ログイン', () => {
  it('ログインしていなければログイン画面を出し、ログインすると元の画面に進む', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(unauthorized())
      .mockResolvedValueOnce(jsonResponse(member))
      .mockResolvedValueOnce(jsonResponse([]))
    vi.stubGlobal('fetch', fetchMock)

    renderGate()

    fireEvent.change(await screen.findByLabelText('メールアドレス'), { target: { value: 'member@example.com' } })
    fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: 'ログイン' }))

    expect(await screen.findByText('チケットはまだありません')).toBeInTheDocument()
    expect(screen.getByText('佐藤')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/v1/session')
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/v1/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'member@example.com', password: 'password123' }),
    })
  })

  it('メールアドレスかパスワードが違えば、エラーを表示する', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(unauthorized())
        .mockResolvedValueOnce(jsonResponse({ errors: ['メールアドレスかパスワードが違います'] }, 401)),
    )

    renderGate()
    fireEvent.click(await screen.findByRole('button', { name: 'ログイン' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('メールアドレスかパスワードが違います')
    expect(screen.getByLabelText('パスワード')).toBeInTheDocument()
  })

  it('ログイン中なら、そのまま画面を出す', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(member)).mockResolvedValueOnce(jsonResponse([])))

    renderGate()

    expect(await screen.findByText('チケットはまだありません')).toBeInTheDocument()
    expect(screen.queryByLabelText('パスワード')).not.toBeInTheDocument()
  })

  it('ログアウトすると、ログイン画面に戻る', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(member))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(jsonResponse(null, 204))
    vi.stubGlobal('fetch', fetchMock)

    renderGate()
    fireEvent.click(await screen.findByRole('button', { name: 'ログアウト' }))

    expect(await screen.findByLabelText('パスワード')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenLastCalledWith('/api/v1/session', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    })
  })

  it('使っている途中でAPIが401を返したら、ログイン画面に戻る', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(member)).mockResolvedValueOnce(unauthorized()))

    renderGate()

    expect(await screen.findByLabelText('パスワード')).toBeInTheDocument()
  })
})
