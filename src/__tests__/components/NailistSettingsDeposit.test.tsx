/**
 * Covers the "מקדמה בביט" (Bit deposit) toggle on the nailist settings page.
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import NailistSettingsPage from '@/app/dashboard/nailist/settings/page'

jest.mock('@/lib/firebase/storage', () => ({
  uploadProfilePhoto: jest.fn(),
  uploadCoverPhoto: jest.fn(),
}))

jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ user: { uid: 'nailist-user-1' } }),
}))

const baseProfile = {
  id: 'nailist-1',
  businessName: 'סטודיו יופי',
  bio: '',
  city: 'תל אביב',
  address: '',
  phoneNumber: '',
  whatsappPhone: '',
  instagramUrl: '',
  tiktokUrl: '',
  isActive: true,
  photoUrl: null as string | null,
  depositEnabled: false,
  depositPercentage: 20,
  bitPhone: '',
}

let lastPatchBody: unknown = null

function mockFetch(profile: typeof baseProfile) {
  lastPatchBody = null
  global.fetch = jest.fn().mockImplementation((url: string, opts?: RequestInit) => {
    if (url.includes('/api/me/nailist-profile')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: profile }) } as Response)
    }
    if (url.includes('/api/nailists/') && opts?.method === 'PATCH') {
      lastPatchBody = JSON.parse((opts.body as string) ?? '{}')
      return Promise.resolve({ ok: true, json: async () => ({ message: 'ok' }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
  })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('NailistSettingsPage — Bit deposit', () => {
  it('hides the percentage and phone fields until the toggle is switched on', async () => {
    mockFetch(baseProfile)
    render(<NailistSettingsPage />)

    await waitFor(() => expect(screen.getByText('הגדרות פרופיל')).toBeInTheDocument())
    expect(screen.getByText('לא נדרשת מקדמה מלקוחות')).toBeInTheDocument()
    expect(screen.queryByText('אחוז מקדמה')).not.toBeInTheDocument()
    expect(screen.queryByText('מספר טלפון לביט')).not.toBeInTheDocument()
  })

  it('reveals the percentage and phone fields once the toggle is switched on', async () => {
    mockFetch(baseProfile)
    render(<NailistSettingsPage />)

    await waitFor(() => expect(screen.getByText('הגדרות פרופיל')).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText('הפעלת מקדמה בביט'))

    expect(await screen.findByText('אחוז מקדמה')).toBeInTheDocument()
    expect(screen.getByText('מספר טלפון לביט')).toBeInTheDocument()
    expect(screen.getByText('לקוחות יתבקשו לשלוח מקדמה דרך Bit לפני התור')).toBeInTheDocument()
  })

  it('shows a live deposit-amount example that updates with the percentage', async () => {
    mockFetch({ ...baseProfile, depositEnabled: true, depositPercentage: 20 })
    render(<NailistSettingsPage />)

    await waitFor(() => expect(screen.getByText(/מקדמה של ₪30/)).toBeInTheDocument())

    const percentInput = screen.getByDisplayValue('20')
    fireEvent.change(percentInput, { target: { value: '10' } })

    await waitFor(() => expect(screen.getByText(/מקדמה של ₪15/)).toBeInTheDocument())
  })

  it('saves the full expected body including the deposit fields', async () => {
    mockFetch({ ...baseProfile, depositEnabled: true, depositPercentage: 15, bitPhone: '0501234567' })
    render(<NailistSettingsPage />)

    await waitFor(() => expect(screen.getByDisplayValue('0501234567')).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: 'שמרי שינויים' }))

    await waitFor(() => {
      expect(lastPatchBody).toMatchObject({
        depositEnabled: true,
        depositPercentage: 15,
        bitPhone: '0501234567',
      })
    })
  })
})
