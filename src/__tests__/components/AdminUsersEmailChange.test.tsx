import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import AdminUsersPage from '@/app/admin/users/page'

jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ user: { uid: 'admin-1' }, refreshRole: jest.fn() }),
}))

const users = [
  { id: 'u1', email: 'typo@gmail.cin', displayName: 'Yuval', photoUrl: null, role: 'CLIENT', isAdmin: false, suspended: false, createdAt: null, onboardingCompleted: true, emailDeliveryStatus: 'BOUNCED' },
  { id: 'admin-1', email: 'admin@test.com', displayName: 'Admin', photoUrl: null, role: 'NAILIST', isAdmin: true, suspended: false, createdAt: null, onboardingCompleted: true, emailDeliveryStatus: null },
]

const bodies: Record<string, unknown>[] = []
let responses: { ok: boolean; json: unknown }[] = []

function mockFetch() {
  global.fetch = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (url.includes('/email')) {
      bodies.push(JSON.parse((init?.body as string) ?? '{}'))
      const next = responses.shift() ?? { ok: true, json: { data: {} } }
      return Promise.resolve({ ok: next.ok, json: async () => next.json } as Response)
    }
    if (url.startsWith('/api/admin/stats')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: { totalUsers: 2 } }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: users }) } as Response)
  })
}

async function openModal() {
  fireEvent.click((await screen.findAllByTitle('שנה כתובת מייל'))[0])
}

async function requestCode(newEmail = 'fixed@gmail.com') {
  await openModal()
  fireEvent.change(screen.getByLabelText('כתובת חדשה'), { target: { value: newEmail } })
  fireEvent.click(screen.getByRole('button', { name: 'שלח קוד אישור' }))
}

describe('AdminUsersPage — guarded email change', () => {
  beforeEach(() => {
    bodies.length = 0
    responses = [{ ok: true, json: { data: { challengeId: 'c1', sentTo: 'nailistiotil@gmail.com' } } }]
    mockFetch()
  })

  it('offers the edit action on regular users but not on admin accounts', async () => {
    render(<AdminUsersPage />)
    await screen.findByText('typo@gmail.cin')
    expect(screen.getAllByTitle('שנה כתובת מייל')).toHaveLength(1)
  })

  it('requests a code first and does not apply anything yet', async () => {
    render(<AdminUsersPage />)
    await requestCode()

    await waitFor(() => expect(bodies[0]).toEqual({ step: 'request', email: 'fixed@gmail.com' }))
    expect(bodies).toHaveLength(1)
    expect(await screen.findByText(/nailistiotil@gmail.com/)).toBeInTheDocument()
  })

  it('only applies the change after the code is entered', async () => {
    responses.push({ ok: true, json: { data: { targetUid: 'u1', newEmail: 'fixed@gmail.com' } } })
    render(<AdminUsersPage />)
    await requestCode()

    const codeInput = await screen.findByLabelText('קוד אישור')
    fireEvent.change(codeInput, { target: { value: '123456' } })
    fireEvent.click(screen.getByRole('button', { name: 'אישור השינוי' }))

    await waitFor(() => expect(bodies[1]).toEqual({ step: 'confirm', challengeId: 'c1', code: '123456' }))
    expect(await screen.findByText(/כתובת המייל עודכנה ל-fixed@gmail.com/)).toBeInTheDocument()
    expect(screen.getByText('fixed@gmail.com')).toBeInTheDocument()
  })

  it('keeps the confirm button disabled until six digits are entered', async () => {
    render(<AdminUsersPage />)
    await requestCode()

    const codeInput = await screen.findByLabelText('קוד אישור')
    expect(screen.getByRole('button', { name: 'אישור השינוי' })).toBeDisabled()

    fireEvent.change(codeInput, { target: { value: '12345' } })
    expect(screen.getByRole('button', { name: 'אישור השינוי' })).toBeDisabled()

    fireEvent.change(codeInput, { target: { value: '123456' } })
    expect(screen.getByRole('button', { name: 'אישור השינוי' })).toBeEnabled()
  })

  it('strips non-digits from the typed code', async () => {
    render(<AdminUsersPage />)
    await requestCode()

    const codeInput = await screen.findByLabelText('קוד אישור') as HTMLInputElement
    fireEvent.change(codeInput, { target: { value: '12a3b4' } })
    expect(codeInput.value).toBe('1234')
  })

  it('stays on the code step and shows the error when the code is wrong', async () => {
    responses.push({ ok: false, json: { error: 'קוד שגוי — נותרו 4 ניסיונות' } })
    render(<AdminUsersPage />)
    await requestCode()

    fireEvent.change(await screen.findByLabelText('קוד אישור'), { target: { value: '000000' } })
    fireEvent.click(screen.getByRole('button', { name: 'אישור השינוי' }))

    expect(await screen.findByText('קוד שגוי — נותרו 4 ניסיונות')).toBeInTheDocument()
    expect(screen.getByLabelText('קוד אישור')).toBeInTheDocument()
    expect(screen.getByText('typo@gmail.cin')).toBeInTheDocument()
  })

  it('surfaces a rejected request without advancing to the code step', async () => {
    responses = [{ ok: false, json: { error: 'כתובת מייל לא תקינה' } }]
    render(<AdminUsersPage />)
    await requestCode('nope')

    expect(await screen.findByText('כתובת מייל לא תקינה')).toBeInTheDocument()
    expect(screen.queryByLabelText('קוד אישור')).not.toBeInTheDocument()
  })
})
