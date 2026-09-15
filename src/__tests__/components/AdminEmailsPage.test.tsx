import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import AdminEmailsPage from '@/app/admin/emails/page'

const users = [
  { id: 'u1', email: 'alice@test.com', displayName: 'Alice', role: 'CLIENT', emailVerified: false, emailDeliveryStatus: 'BOUNCED' },
  { id: 'u2', email: 'bob@test.com', displayName: 'Bob', role: 'NAILIST', emailVerified: true, emailDeliveryStatus: null },
  { id: 'u3', email: 'dana@test.com', displayName: 'Dana', role: 'CLIENT', emailVerified: false, emailDeliveryStatus: null },
]

let lastUsersUrl = ''
let lastSendBody: { template?: string; userIds?: string[]; subject?: string; message?: string; operationId?: string } | null = null
let sendResponse: { ok: boolean; json: unknown }

function mockFetch() {
  global.fetch = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (url.startsWith('/api/admin/emails')) {
      lastSendBody = JSON.parse((init?.body as string) ?? '{}')
      return Promise.resolve({ ok: sendResponse.ok, json: async () => sendResponse.json } as Response)
    }
    lastUsersUrl = url
    return Promise.resolve({ ok: true, json: async () => ({ data: users }) } as Response)
  })
}

async function selectRecipient(email: string) {
  fireEvent.click(await screen.findByLabelText(`בחר את ${email}`))
}

async function confirmSend() {
  fireEvent.click(screen.getByRole('button', { name: /מעבר לאישור שליחה/ }))
  fireEvent.click(await screen.findByRole('button', { name: 'העבירי לשליחה' }))
}

describe('AdminEmailsPage', () => {
  beforeEach(() => {
    lastUsersUrl = ''
    lastSendBody = null
    sendResponse = { ok: true, json: { data: { sent: [{ id: 'u3', email: 'dana@test.com' }], skipped: [], failed: [] } } }
    mockFetch()
  })

  it('asks the users endpoint for verification status', async () => {
    render(<AdminEmailsPage />)
    await waitFor(() => expect(lastUsersUrl).toContain('withEmailVerified=1'))
  })

  it('marks unverified and bounced recipients in the list', async () => {
    render(<AdminEmailsPage />)
    expect((await screen.findAllByText('לא אומת')).length).toBeGreaterThan(0)
    expect(screen.getByText('מייל חזר')).toBeInTheDocument()
  })

  it('filters the list down to unverified recipients', async () => {
    render(<AdminEmailsPage />)
    await screen.findByText('alice@test.com')
    fireEvent.click(screen.getByLabelText('רק מיילים שלא אומתו'))

    expect(screen.getByText('alice@test.com')).toBeInTheDocument()
    expect(screen.queryByText('bob@test.com')).not.toBeInTheDocument()
  })

  it('keeps the send button disabled until a recipient is chosen', async () => {
    render(<AdminEmailsPage />)
    await screen.findByText('dana@test.com')
    const button = screen.getByRole('button', { name: /שליחה ל-0 נמענים/ })
    expect(button).toBeDisabled()

    await selectRecipient('dana@test.com')
    expect(screen.getByRole('button', { name: /שליחה ל-1 נמענים/ })).toBeEnabled()
  })

  it('does not allow a bounced recipient to be selected', async () => {
    render(<AdminEmailsPage />)
    expect(await screen.findByLabelText('בחר את alice@test.com')).toBeDisabled()
  })

  it('does not include blocked addresses when selecting all visible recipients', async () => {
    render(<AdminEmailsPage />)
    await screen.findByText('dana@test.com')
    fireEvent.click(screen.getByRole('button', { name: 'בחר הכל' }))

    expect(screen.getByRole('button', { name: /שליחה ל-2 נמענים/ })).toBeEnabled()
    expect(screen.getByLabelText('בחר את alice@test.com')).not.toBeChecked()
  })

  it('sends a verification email to the selected recipients', async () => {
    render(<AdminEmailsPage />)
    await selectRecipient('dana@test.com')
    await confirmSend()

    await waitFor(() => expect(lastSendBody).toEqual(expect.objectContaining({ template: 'VERIFICATION', userIds: ['u3'] })))
    expect(await screen.findByText('הועברו לשליחה 1 מיילים')).toBeInTheDocument()
  })

  it('requires a subject and body before a custom message can be sent', async () => {
    render(<AdminEmailsPage />)
    await selectRecipient('dana@test.com')
    fireEvent.click(screen.getByRole('button', { name: /הודעה מותאמת/ }))

    expect(screen.getByRole('button', { name: /שליחה ל-1 נמענים/ })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('נושא'), { target: { value: 'עדכון' } })
    expect(screen.getByRole('button', { name: /שליחה ל-1 נמענים/ })).toBeDisabled()

    fireEvent.change(screen.getByLabelText('תוכן ההודעה'), { target: { value: 'שלום' } })
    await confirmSend()

    await waitFor(() => expect(lastSendBody).toEqual(expect.objectContaining({
      template: 'CUSTOM', userIds: ['u3'], subject: 'עדכון', message: 'שלום',
    })))
  })

  it('lists skipped and failed recipients from the send report', async () => {
    sendResponse = {
      ok: true,
      json: {
        data: {
          sent: [],
          skipped: [{ id: 'u2', email: 'bob@test.com', reason: 'המייל כבר מאומת' }],
          failed: [{ id: 'u3', email: 'dana@test.com', error: 'Resend error 429' }],
        },
      },
    }
    render(<AdminEmailsPage />)
    await selectRecipient('dana@test.com')
    await confirmSend()

    expect(await screen.findByText(/bob@test.com: המייל כבר מאומת/)).toBeInTheDocument()
    expect(screen.getByText(/dana@test.com: Resend error 429/)).toBeInTheDocument()
  })

  it('surfaces a rejected request instead of reporting a successful send', async () => {
    sendResponse = { ok: false, json: { error: 'אין הרשאה' } }
    render(<AdminEmailsPage />)
    await selectRecipient('dana@test.com')
    await confirmSend()

    expect(await screen.findByText('אין הרשאה')).toBeInTheDocument()
    expect(screen.queryByText(/הועברו לשליחה/)).not.toBeInTheDocument()
  })
})
