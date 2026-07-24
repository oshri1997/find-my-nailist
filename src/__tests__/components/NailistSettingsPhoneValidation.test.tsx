/**
 * Regression: phoneNumber/whatsappPhone/bitPhone on the nailist settings
 * page had no real format check (any 7-20 character string of digits/dashes
 * passed), so an obviously-wrong number sailed through client-side and only
 * got rejected server-side with a generic "שגיאה בשמירה" that didn't say
 * which field was actually wrong. Inline validation catches it before the
 * save request is even sent, and points at the specific field.
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
  depositEnabled: true,
  depositPercentage: 20,
  bitPhone: '',
}

let patchCalled = false

function mockFetch(profile: typeof baseProfile) {
  patchCalled = false
  global.fetch = jest.fn().mockImplementation((url: string, opts?: RequestInit) => {
    if (url.includes('/api/me/nailist-profile')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: profile }) } as Response)
    }
    if (url.includes('/api/nailists/') && opts?.method === 'PATCH') {
      patchCalled = true
      return Promise.resolve({ ok: true, json: async () => ({ message: 'ok' }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
  })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('NailistSettingsPage — phone validation', () => {
  it('shows an inline error under מספר טלפון for a garbage-length number and blocks save', async () => {
    mockFetch(baseProfile)
    render(<NailistSettingsPage />)
    await waitFor(() => expect(screen.getByText('הגדרות פרופיל')).toBeInTheDocument())

    const phoneInput = document.getElementsByName('phoneNumber')[0] as HTMLInputElement
    fireEvent.change(phoneInput, { target: { value: '1232131231231231231231231231231231' } })

    expect(screen.getByText('מספר טלפון אינו תקין')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'שמרי שינויים' }))
    expect(screen.getByText('אחד ממספרי הטלפון אינו תקין — בדקי ותקני')).toBeInTheDocument()
    expect(patchCalled).toBe(false)
  })

  it('shows an inline error under מספר WhatsApp for an invalid number', async () => {
    mockFetch(baseProfile)
    render(<NailistSettingsPage />)
    await waitFor(() => expect(screen.getByText('הגדרות פרופיל')).toBeInTheDocument())

    fireEvent.change(document.getElementsByName('whatsappPhone')[0], { target: { value: 'call me maybe' } })

    expect(screen.getByText('מספר טלפון אינו תקין')).toBeInTheDocument()
    // the normal helper text is replaced by the error, not shown alongside it
    expect(screen.queryByText('לקוחות יוכלו לשלוח לך הודעה ישירה')).not.toBeInTheDocument()
  })

  it('shows an inline error under מספר טלפון לביט for an invalid number', async () => {
    mockFetch(baseProfile)
    render(<NailistSettingsPage />)
    await waitFor(() => expect(screen.getByText('מספר טלפון לביט')).toBeInTheDocument())

    fireEvent.change(document.getElementsByName('bitPhone')[0], { target: { value: '123' } })

    expect(screen.getByText('מספר טלפון אינו תקין')).toBeInTheDocument()
    expect(screen.queryByText('לקוחות ישלחו את המקדמה למספר הזה דרך אפליקציית Bit')).not.toBeInTheDocument()
  })

  it('allows saving once the number is corrected to a real format', async () => {
    mockFetch(baseProfile)
    render(<NailistSettingsPage />)
    await waitFor(() => expect(screen.getByText('הגדרות פרופיל')).toBeInTheDocument())

    fireEvent.change(document.getElementsByName('phoneNumber')[0], { target: { value: 'garbage' } })
    expect(screen.getByText('מספר טלפון אינו תקין')).toBeInTheDocument()

    // re-query fresh — the field re-renders with the error state in between
    fireEvent.change(document.getElementsByName('phoneNumber')[0], { target: { value: '0501234567' } })
    expect(screen.queryByText('מספר טלפון אינו תקין')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'שמרי שינויים' }))
    await waitFor(() => expect(patchCalled).toBe(true))
  })

  it('allows saving with all phone fields empty (they are optional)', async () => {
    mockFetch(baseProfile)
    render(<NailistSettingsPage />)
    await waitFor(() => expect(screen.getByText('הגדרות פרופיל')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'שמרי שינויים' }))
    await waitFor(() => expect(patchCalled).toBe(true))
    expect(screen.queryByText('אחד ממספרי הטלפון אינו תקין — בדקי ותקני')).not.toBeInTheDocument()
  })
})
