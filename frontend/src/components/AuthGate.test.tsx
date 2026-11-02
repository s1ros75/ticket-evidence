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

const member = { id: 1, name: '佐藤', email: 'member@example.com', role: 'member', admin: false }
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
    // 一覧の読み込みが終わってから押し、呼び出しの順番に左右されないようにする
    await screen.findByText('チケットはまだありません')
    fireEvent.click(screen.getByRole('button', { name: 'ログアウト' }))

    expect(await screen.findByLabelText('パスワード')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/session', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    })
  })

  it('使っている途中でAPIが401を返したら、ログイン画面に戻る', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(member)).mockResolvedValueOnce(unauthorized()))

    renderGate()

    expect(await screen.findByLabelText('パスワード')).toBeInTheDocument()
  })

  it('ヘッダーのリンクで、一覧とダッシュボードを行き来できる', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(member))
      .mockResolvedValueOnce(jsonResponse([]))
      .mockResolvedValueOnce(
        jsonResponse({ status_counts: { investigating: 0, in_review: 0, done: 0 }, investigating_with_unknowns: 0 }),
      )
    vi.stubGlobal('fetch', fetchMock)

    renderGate()
    await screen.findByText('チケットはまだありません')
    fireEvent.click(screen.getByRole('link', { name: 'ダッシュボード' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'ダッシュボード' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'チケット一覧' })).toHaveAttribute('href', '/')
  })

  it('管理者にだけ、アカウント管理へのリンクを出す', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse({ ...member, admin: true }))
        .mockResolvedValueOnce(jsonResponse([])),
    )

    renderGate()

    expect(await screen.findByRole('link', { name: 'アカウント管理' })).toHaveAttribute('href', '/admin/users')
    expect(screen.getByRole('link', { name: 'パスワード変更' })).toHaveAttribute('href', '/password')
  })

  it('管理者でなければ、アカウント管理へのリンクを出さない', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(member)).mockResolvedValueOnce(jsonResponse([])))

    renderGate()

    expect(await screen.findByRole('link', { name: 'パスワード変更' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'アカウント管理' })).not.toBeInTheDocument()
  })

  it('デモ環境では、その旨を画面の上に表示する', async () => {
    vi.stubEnv('VITE_DEMO_MODE', '1')
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(member)).mockResolvedValueOnce(jsonResponse([])))

    renderGate()

    expect(await screen.findByRole('note')).toHaveTextContent('デモ環境です')
    vi.unstubAllEnvs()
  })

  it('デモ環境でなければ、表示しない', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse(member)).mockResolvedValueOnce(jsonResponse([])))

    renderGate()

    await screen.findByText('チケットはまだありません')
    expect(screen.queryByRole('note')).not.toBeInTheDocument()
  })
})

