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

const admin: User = { id: 1, name: '管理者', email: 'admin@example.com', role: 'reviewer', admin: true }
const member: User = { id: 2, name: '佐藤', email: 'sato@example.com', role: 'member', admin: false }

function renderAccounts(user: User = admin) {
  return render(
    <CurrentUserContext.Provider value={user}>
      <MemoryRouter initialEntries={['/admin/users']}>
        <App />
      </MemoryRouter>
    </CurrentUserContext.Provider>,
  )
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('アカウント管理', () => {
  it('アカウントの一覧を、ロールと管理者の印つきで表示する', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([admin, member])))

    renderAccounts()

    const rows = await screen.findAllByRole('row')
    expect(rows[1]).toHaveTextContent('管理者admin@example.comレビュアー管理者')
    expect(rows[2]).toHaveTextContent('佐藤sato@example.com担当者')
    expect(fetch).toHaveBeenCalledWith('/api/v1/admin/users')
  })

  it('アカウントを作ると、仮パスワードを表示し、一覧に足す', async () => {
    const created = { id: 3, name: '鈴木', email: 'suzuki@example.com', role: 'reviewer', admin: false }
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([admin]))
      .mockResolvedValueOnce(jsonResponse({ user: created, temporary_password: 'Tmp1234567890abc' }, 201))
    vi.stubGlobal('fetch', fetchMock)

    renderAccounts()
    await screen.findAllByRole('row')

    fireEvent.change(screen.getByLabelText('名前'), { target: { value: '鈴木' } })
    fireEvent.change(screen.getByLabelText('メールアドレス'), { target: { value: 'suzuki@example.com' } })
    fireEvent.change(screen.getByLabelText('ロール'), { target: { value: 'reviewer' } })
    fireEvent.click(screen.getByRole('button', { name: '作成' }))

    const notice = await screen.findByRole('status')
    expect(notice).toHaveTextContent('鈴木 の仮パスワード')
    expect(notice).toHaveTextContent('Tmp1234567890abc')
    expect(notice).toHaveTextContent('この画面を離れると、もう表示できません')
    expect(screen.getAllByRole('row')).toHaveLength(3)
    expect(screen.getByLabelText('名前')).toHaveValue('')
    expect(fetchMock).toHaveBeenLastCalledWith('/api/v1/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: { name: '鈴木', email: 'suzuki@example.com', role: 'reviewer', admin: false } }),
    })
  })

  it('作成に失敗したら、APIが返したエラーを表示する', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(jsonResponse([admin]))
        .mockResolvedValueOnce(jsonResponse({ errors: ['Email has already been taken'] }, 422)),
    )

    renderAccounts()
    await screen.findAllByRole('row')
    fireEvent.click(screen.getByRole('button', { name: '作成' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Email has already been taken')
  })

  it('仮パスワードを発行すると、その人の仮パスワードを表示する', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([admin, member]))
      .mockResolvedValueOnce(jsonResponse({ temporary_password: 'Reset1234567890x' }))
    vi.stubGlobal('fetch', fetchMock)

    renderAccounts()
    const rows = await screen.findAllByRole('row')
    fireEvent.click(within(rows[2]).getByRole('button', { name: '佐藤 の仮パスワードを発行' }))

    const notice = await screen.findByRole('status')
    expect(notice).toHaveTextContent('佐藤 の仮パスワード')
    expect(notice).toHaveTextContent('Reset1234567890x')
    expect(fetchMock).toHaveBeenLastCalledWith('/api/v1/admin/users/2/reset_password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
  })

  it('管理者でなければ、一覧を取りに行かず、その旨を表示する', async () => {
    vi.stubGlobal('fetch', vi.fn())

    renderAccounts(member)

    expect(await screen.findByText('アカウント管理は管理者だけが使えます')).toBeInTheDocument()
    expect(fetch).not.toHaveBeenCalled()
  })
})
