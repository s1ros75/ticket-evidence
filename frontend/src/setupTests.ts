import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// vitestのglobalsを使っていないので、テストごとの後片付けを明示的に登録する
afterEach(() => {
  cleanup()
})
