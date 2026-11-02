import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import App from '../App'
import type { User } from '../api/session'
import { CurrentUserContext } from '../auth/CurrentUserContext'

const member: User = { id: 2, name: '佐藤', email: 'sato@example.com', role: 'member', admin: false }

function renderPassword() {
  return render(
    <CurrentUserContext.Provider value={member}>
      <MemoryRouter initialEntries={['/password']}>
        <App />
      </MemoryRouter>
    </CurrentUserContext.Provider>,
  )
}

function fill(current: string, next: string, confirmation: string) {
  fireEvent.change(screen.getByLabelText('今のパスワード'), { target: { value: current } })
  fireEvent.change(screen.getByLabelText('新しいパスワード'), { target: { value: next } })
  fireEvent.change(screen.getByLabelText('新しいパスワード（確認）'), { target: { value: confirmation } })
  fireEvent.click(screen.getByRole('button', { name: '変更' }))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('パスワード変更', () => {
  it('変更すると、完了を表示し、入力欄を空にする', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    renderPassword()
    fill('old-long-password', 'new-long-password', 'new-long-password')

    expect(await screen.findByRole('status')).toHaveTextContent('パスワードを変更しました')
    expect(screen.getByLabelText('今のパスワード')).toHaveValue('')
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/password', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: 'old-long-password', password: 'new-long-password' }),
    })
  })

  it('確認用と一致しなければ、送らずにエラーを表示する', async () => {
    vi.stubGlobal('fetch', vi.fn())

    renderPassword()
    fill('old-long-password', 'new-long-password', 'different-password')

    expect(await screen.findByRole('alert')).toHaveTextContent('新しいパスワードと確認用が一致しません')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('APIに断られたら、返されたエラーを表示する', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ errors: ['Password challenge is invalid'] }), {
          status: 422,
          headers: { 'Content-Type': 'application/json' },
        }),
      ),
    )

    renderPassword()
    fill('wrong-password', 'new-long-password', 'new-long-password')

    expect(await screen.findByRole('alert')).toHaveTextContent('Password challenge is invalid')
  })
})
