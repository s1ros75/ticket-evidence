// 422のときに、APIが返したエラーメッセージを画面に渡すための例外
export class ValidationError extends Error {
  messages: string[]

  constructor(messages: string[]) {
    super(messages.join(', '))
    this.messages = messages
  }
}

export class NotFoundError extends Error {}

export class UnauthorizedError extends Error {}

// セッションが切れたときなどに、ログイン画面へ戻すための通知先（AuthGateが登録する）
let unauthorizedHandler: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null) {
  unauthorizedHandler = handler
}

async function handleErrors(response: Response, label: string) {
  if (response.status === 401) {
    unauthorizedHandler?.()
    throw new UnauthorizedError()
  }
  if (response.status === 404) {
    throw new NotFoundError()
  }
  if (response.status === 422) {
    const body: { errors: string[] } = await response.json()
    throw new ValidationError(body.errors)
  }
  if (!response.ok) {
    throw new Error(`${label} failed: ${response.status}`)
  }
}

export async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  await handleErrors(response, `GET ${url}`)
  return response.json()
}

export async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  await handleErrors(response, `POST ${url}`)
  return response.json()
}
