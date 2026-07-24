/**
 * Covers the shared /settings page — every logged-in user (client or
 * nailist) can change their profile photo, change their password (if the
 * account has one), and delete their account. Nailists manage their
 * business identity (businessName, services, etc.) separately in
 * /dashboard/nailist/settings — this page is account-level only.
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import SettingsPage from '@/app/settings/page'

const mockPush = jest.fn()
const mockReplace = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: mockReplace }),
}))

const mockSignOut = jest.fn()
const mockUseAuth = jest.fn()
jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => mockUseAuth(),
}))

const uploadProfilePhotoMock = jest.fn()
jest.mock('@/lib/firebase/storage', () => ({
  uploadProfilePhoto: (...args: unknown[]) => uploadProfilePhotoMock(...args),
}))

const hasPasswordProviderMock = jest.fn()
const changePasswordMock = jest.fn()
const reauthenticateWithPasswordMock = jest.fn()
const reauthenticateWithGoogleMock = jest.fn()
jest.mock('@/lib/firebase/auth-helpers', () => ({
  hasPasswordProvider: (...args: unknown[]) => hasPasswordProviderMock(...args),
  changePassword: (...args: unknown[]) => changePasswordMock(...args),
  reauthenticateWithPassword: (...args: unknown[]) => reauthenticateWithPasswordMock(...args),
  reauthenticateWithGoogle: (...args: unknown[]) => reauthenticateWithGoogleMock(...args),
}))

const clientProfile = {
  id: 'client-profile-1',
  photoUrl: 'https://example.com/old-photo.jpg',
  firstName: 'שרה',
  lastName: 'כהן',
  phoneNumber: '0501234567',
}

function mockFetch(overrides: { deleteStatus?: number; deleteError?: string } = {}) {
  global.fetch = jest.fn().mockImplementation((url: string, opts?: RequestInit) => {
    if (url.includes('/api/me/nailist-profile')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: { id: 'nailist-profile-1', photoUrl: 'https://example.com/nailist-photo.jpg' } }) } as Response)
    }
    if (url === '/api/me/client-profile' && (!opts || opts.method === undefined)) {
      return Promise.resolve({ ok: true, json: async () => ({ data: clientProfile }) } as Response)
    }
    if (url === '/api/me/client-profile' && opts?.method === 'PATCH') {
      return Promise.resolve({ ok: true, json: async () => ({ data: {} }) } as Response)
    }
    if (url.startsWith('/api/nailists/') && opts?.method === 'PATCH') {
      return Promise.resolve({ ok: true, json: async () => ({ message: 'ok' }) } as Response)
    }
    if (url === '/api/me/account' && opts?.method === 'DELETE') {
      if (overrides.deleteStatus && overrides.deleteStatus !== 200) {
        return Promise.resolve({
          ok: false,
          status: overrides.deleteStatus,
          json: async () => ({ error: overrides.deleteError ?? 'שגיאה' }),
        } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({ message: 'ok' }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  hasPasswordProviderMock.mockReturnValue(true)
  mockFetch()
})

describe('Settings page — auth guard', () => {
  it('redirects to /login when not signed in', () => {
    mockUseAuth.mockReturnValue({ user: null, role: null, loading: false, signOut: mockSignOut })
    render(<SettingsPage />)
    expect(mockReplace).toHaveBeenCalledWith('/login')
  })
})

describe('Settings page — profile photo', () => {
  it('loads and displays the client profile photo, and PATCHes /api/me/client-profile on upload', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'client-1', email: 'sarah@test.com' }, role: 'CLIENT', loading: false, signOut: mockSignOut })
    uploadProfilePhotoMock.mockResolvedValue({ url: 'https://example.com/new-photo.jpg', storageKey: 'avatars/client-1/profile.jpg' })
    const { container } = render(<SettingsPage />)

    await waitFor(() => expect(screen.getByText('הגדרות חשבון')).toBeInTheDocument())

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['bytes'], 'avatar.jpg', { type: 'image/jpeg' })
    fireEvent.change(fileInput, { target: { files: [file] } })

    await waitFor(() => expect(uploadProfilePhotoMock).toHaveBeenCalledWith('client-1', file))
    await waitFor(() => {
      const patchCall = (global.fetch as jest.Mock).mock.calls.find(
        ([url, opts]: [string, RequestInit]) => url === '/api/me/client-profile' && opts?.method === 'PATCH'
      )
      expect(patchCall).toBeDefined()
      expect(JSON.parse(patchCall[1].body as string)).toEqual({ photoUrl: 'https://example.com/new-photo.jpg' })
    })
  })

  it('PATCHes /api/nailists/[id] (not client-profile) for a nailist account', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'nailist-1', email: 'studio@test.com' }, role: 'NAILIST', loading: false, signOut: mockSignOut })
    uploadProfilePhotoMock.mockResolvedValue({ url: 'https://example.com/new-photo.jpg', storageKey: 'avatars/nailist-1/profile.jpg' })
    const { container } = render(<SettingsPage />)

    await waitFor(() => expect(screen.getByText('הגדרות חשבון')).toBeInTheDocument())

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [new File(['bytes'], 'avatar.jpg', { type: 'image/jpeg' })] } })

    await waitFor(() => {
      const patchCall = (global.fetch as jest.Mock).mock.calls.find(
        ([url, opts]: [string, RequestInit]) => url === '/api/nailists/nailist-profile-1' && opts?.method === 'PATCH'
      )
      expect(patchCall).toBeDefined()
    })
  })

  it('refuses to upload when the nailist profile id never loaded, instead of PATCHing /api/nailists/null', async () => {
    // Regression: if GET /api/me/nailist-profile resolves with no data (a
    // transient failure, or the profile doc genuinely doesn't exist yet),
    // profileId stays null but the page still finishes loading and shows the
    // upload button. Clicking it used to PATCH the literal string "null",
    // which fails silently — the real photo never saves, so whatever was
    // there before (or the Google-photo/backfill default) keeps showing
    // indefinitely with no visible error.
    global.fetch = jest.fn().mockImplementation((url: string) => {
      if (url.includes('/api/me/nailist-profile')) {
        return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
    })
    mockUseAuth.mockReturnValue({ user: { uid: 'nailist-1', email: 'studio@test.com' }, role: 'NAILIST', loading: false, signOut: mockSignOut })
    const { container } = render(<SettingsPage />)
    await waitFor(() => expect(screen.getByText('הגדרות חשבון')).toBeInTheDocument())

    const fileInput = container.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [new File(['bytes'], 'avatar.jpg', { type: 'image/jpeg' })] } })

    await waitFor(() => expect(screen.getByText('הפרופיל עדיין נטען — נסי שוב בעוד רגע')).toBeInTheDocument())
    expect(uploadProfilePhotoMock).not.toHaveBeenCalled()
    const badPatch = (global.fetch as jest.Mock).mock.calls.find(
      ([url]: [string]) => url === '/api/nailists/null'
    )
    expect(badPatch).toBeUndefined()
  })
})

describe('Settings page — personal info (clients only)', () => {
  it('shows the personal-info form pre-filled for a client', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'client-1', email: 'sarah@test.com' }, role: 'CLIENT', loading: false, signOut: mockSignOut })
    render(<SettingsPage />)

    await waitFor(() => expect(screen.getByDisplayValue('שרה')).toBeInTheDocument())
    expect(screen.getByDisplayValue('כהן')).toBeInTheDocument()
    expect(screen.getByDisplayValue('0501234567')).toBeInTheDocument()
  })

  it('does not show the personal-info form for a nailist', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'nailist-1', email: 'studio@test.com' }, role: 'NAILIST', loading: false, signOut: mockSignOut })
    render(<SettingsPage />)

    await waitFor(() => expect(screen.getByText('הגדרות חשבון')).toBeInTheDocument())
    expect(screen.queryByText('פרטים אישיים')).not.toBeInTheDocument()
  })

  it('rejects an invalid phone number and blocks save', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'client-1', email: 'sarah@test.com' }, role: 'CLIENT', loading: false, signOut: mockSignOut })
    render(<SettingsPage />)

    const phoneInput = await screen.findByDisplayValue('0501234567')
    fireEvent.change(phoneInput, { target: { value: 'garbage' } })
    fireEvent.click(screen.getByRole('button', { name: 'שמרי שינויים' }))

    expect(screen.getByText('מספר טלפון אינו תקין')).toBeInTheDocument()
    const patchCall = (global.fetch as jest.Mock).mock.calls.find(
      ([url, opts]: [string, RequestInit]) => url === '/api/me/client-profile' && opts?.method === 'PATCH'
    )
    expect(patchCall).toBeUndefined()
  })

  it('saves valid personal info and shows a success confirmation', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'client-1', email: 'sarah@test.com' }, role: 'CLIENT', loading: false, signOut: mockSignOut })
    render(<SettingsPage />)

    await screen.findByDisplayValue('שרה')
    fireEvent.click(screen.getByRole('button', { name: 'שמרי שינויים' }))

    await waitFor(() => expect(screen.getByText('נשמר בהצלחה!')).toBeInTheDocument())
  })
})

describe('Settings page — change password', () => {
  it('shows the password form for an email/password account', async () => {
    hasPasswordProviderMock.mockReturnValue(true)
    mockUseAuth.mockReturnValue({ user: { uid: 'client-1', email: 'sarah@test.com' }, role: 'CLIENT', loading: false, signOut: mockSignOut })
    render(<SettingsPage />)

    await waitFor(() => expect(screen.getByText('שינוי סיסמה')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'עדכני סיסמה' })).toBeInTheDocument()
  })

  it('hides the password form and shows a Google-account message when there is no password provider', async () => {
    hasPasswordProviderMock.mockReturnValue(false)
    mockUseAuth.mockReturnValue({ user: { uid: 'client-1', email: 'sarah@test.com' }, role: 'CLIENT', loading: false, signOut: mockSignOut })
    render(<SettingsPage />)

    await waitFor(() => expect(screen.getByText('שינוי סיסמה')).toBeInTheDocument())
    expect(screen.getByText('החשבון שלך מחובר דרך Google — אין סיסמה לשינוי כאן.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'עדכני סיסמה' })).not.toBeInTheDocument()
  })

  it('rejects a new password shorter than 8 characters without calling changePassword', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'client-1', email: 'sarah@test.com' }, role: 'CLIENT', loading: false, signOut: mockSignOut })
    render(<SettingsPage />)
    await waitFor(() => expect(screen.getByText('שינוי סיסמה')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('סיסמה נוכחית'), { target: { value: 'oldpassword' } })
    fireEvent.change(screen.getByLabelText('סיסמה חדשה'), { target: { value: 'short1' } })
    fireEvent.change(screen.getByLabelText('אימות סיסמה חדשה'), { target: { value: 'short1' } })
    fireEvent.click(screen.getByRole('button', { name: 'עדכני סיסמה' }))

    expect(screen.getByText('הסיסמה חייבת להכיל לפחות 8 תווים')).toBeInTheDocument()
    expect(changePasswordMock).not.toHaveBeenCalled()
  })

  it('rejects mismatched new/confirm passwords', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'client-1', email: 'sarah@test.com' }, role: 'CLIENT', loading: false, signOut: mockSignOut })
    render(<SettingsPage />)
    await waitFor(() => expect(screen.getByText('שינוי סיסמה')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('סיסמה נוכחית'), { target: { value: 'oldpassword' } })
    fireEvent.change(screen.getByLabelText('סיסמה חדשה'), { target: { value: 'newpassword1' } })
    fireEvent.change(screen.getByLabelText('אימות סיסמה חדשה'), { target: { value: 'newpassword2' } })
    fireEvent.click(screen.getByRole('button', { name: 'עדכני סיסמה' }))

    expect(screen.getByText('הסיסמאות אינן תואמות')).toBeInTheDocument()
    expect(changePasswordMock).not.toHaveBeenCalled()
  })

  it('changes the password and shows a success confirmation', async () => {
    changePasswordMock.mockResolvedValue(undefined)
    mockUseAuth.mockReturnValue({ user: { uid: 'client-1', email: 'sarah@test.com' }, role: 'CLIENT', loading: false, signOut: mockSignOut })
    render(<SettingsPage />)
    await waitFor(() => expect(screen.getByText('שינוי סיסמה')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('סיסמה נוכחית'), { target: { value: 'oldpassword' } })
    fireEvent.change(screen.getByLabelText('סיסמה חדשה'), { target: { value: 'newpassword1' } })
    fireEvent.change(screen.getByLabelText('אימות סיסמה חדשה'), { target: { value: 'newpassword1' } })
    fireEvent.click(screen.getByRole('button', { name: 'עדכני סיסמה' }))

    await waitFor(() => expect(changePasswordMock).toHaveBeenCalledWith('oldpassword', 'newpassword1'))
    await waitFor(() => expect(screen.getByText('הסיסמה עודכנה!')).toBeInTheDocument())
  })

  it('shows a friendly error when the current password is wrong', async () => {
    changePasswordMock.mockRejectedValue({ code: 'auth/wrong-password' })
    mockUseAuth.mockReturnValue({ user: { uid: 'client-1', email: 'sarah@test.com' }, role: 'CLIENT', loading: false, signOut: mockSignOut })
    render(<SettingsPage />)
    await waitFor(() => expect(screen.getByText('שינוי סיסמה')).toBeInTheDocument())

    fireEvent.change(screen.getByLabelText('סיסמה נוכחית'), { target: { value: 'wrongpassword' } })
    fireEvent.change(screen.getByLabelText('סיסמה חדשה'), { target: { value: 'newpassword1' } })
    fireEvent.change(screen.getByLabelText('אימות סיסמה חדשה'), { target: { value: 'newpassword1' } })
    fireEvent.click(screen.getByRole('button', { name: 'עדכני סיסמה' }))

    await waitFor(() => expect(screen.getByText('הסיסמה שגויה')).toBeInTheDocument())
  })
})

describe('Settings page — delete account', () => {
  it('requires a password confirmation before allowing delete, for a password account', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'client-1', email: 'sarah@test.com' }, role: 'CLIENT', loading: false, signOut: mockSignOut })
    render(<SettingsPage />)
    await waitFor(() => expect(screen.getByText('אזור מסוכן')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'מחקי את החשבון שלי' }))

    expect(screen.getByText('הזיני סיסמה לאישור')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'כן, מחקי לצמיתות' })).toBeDisabled()
  })

  it('reauthenticates with the password, calls DELETE /api/me/account, signs out, and redirects home', async () => {
    reauthenticateWithPasswordMock.mockResolvedValue(undefined)
    mockUseAuth.mockReturnValue({ user: { uid: 'client-1', email: 'sarah@test.com' }, role: 'CLIENT', loading: false, signOut: mockSignOut })
    render(<SettingsPage />)
    await waitFor(() => expect(screen.getByText('אזור מסוכן')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'מחקי את החשבון שלי' }))
    fireEvent.change(screen.getByLabelText('הזיני סיסמה לאישור'), { target: { value: 'mypassword' } })
    fireEvent.click(screen.getByRole('button', { name: 'כן, מחקי לצמיתות' }))

    await waitFor(() => expect(reauthenticateWithPasswordMock).toHaveBeenCalledWith('mypassword'))
    await waitFor(() => {
      const deleteCall = (global.fetch as jest.Mock).mock.calls.find(
        ([url, opts]: [string, RequestInit]) => url === '/api/me/account' && opts?.method === 'DELETE'
      )
      expect(deleteCall).toBeDefined()
    })
    await waitFor(() => expect(mockSignOut).toHaveBeenCalled())
    expect(mockPush).toHaveBeenCalledWith('/')
  })

  it('uses Google reauthentication instead of a password field for a Google-only account', async () => {
    hasPasswordProviderMock.mockReturnValue(false)
    reauthenticateWithGoogleMock.mockResolvedValue(undefined)
    mockUseAuth.mockReturnValue({ user: { uid: 'client-1', email: 'sarah@test.com' }, role: 'CLIENT', loading: false, signOut: mockSignOut })
    render(<SettingsPage />)
    await waitFor(() => expect(screen.getByText('אזור מסוכן')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'מחקי את החשבון שלי' }))
    expect(screen.queryByText('הזיני סיסמה לאישור')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'כן, מחקי לצמיתות' }))

    await waitFor(() => expect(reauthenticateWithGoogleMock).toHaveBeenCalled())
    expect(reauthenticateWithPasswordMock).not.toHaveBeenCalled()
    await waitFor(() => expect(mockSignOut).toHaveBeenCalled())
  })

  it('does not delete or sign out when reauthentication fails', async () => {
    reauthenticateWithPasswordMock.mockRejectedValue({ code: 'auth/wrong-password' })
    mockUseAuth.mockReturnValue({ user: { uid: 'client-1', email: 'sarah@test.com' }, role: 'CLIENT', loading: false, signOut: mockSignOut })
    render(<SettingsPage />)
    await waitFor(() => expect(screen.getByText('אזור מסוכן')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'מחקי את החשבון שלי' }))
    fireEvent.change(screen.getByLabelText('הזיני סיסמה לאישור'), { target: { value: 'wrongpassword' } })
    fireEvent.click(screen.getByRole('button', { name: 'כן, מחקי לצמיתות' }))

    await waitFor(() => expect(screen.getByText('הסיסמה שגויה')).toBeInTheDocument())
    expect(mockSignOut).not.toHaveBeenCalled()
    const deleteCall = (global.fetch as jest.Mock).mock.calls.find(
      ([url, opts]: [string, RequestInit]) => url === '/api/me/account' && opts?.method === 'DELETE'
    )
    expect(deleteCall).toBeUndefined()
  })

  it('shows the server error and does not sign out when the delete request itself fails', async () => {
    reauthenticateWithPasswordMock.mockResolvedValue(undefined)
    mockFetch({ deleteStatus: 403, deleteError: 'לא ניתן למחוק חשבון אדמין' })
    mockUseAuth.mockReturnValue({ user: { uid: 'client-1', email: 'sarah@test.com' }, role: 'CLIENT', loading: false, signOut: mockSignOut })
    render(<SettingsPage />)
    await waitFor(() => expect(screen.getByText('אזור מסוכן')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'מחקי את החשבון שלי' }))
    fireEvent.change(screen.getByLabelText('הזיני סיסמה לאישור'), { target: { value: 'mypassword' } })
    fireEvent.click(screen.getByRole('button', { name: 'כן, מחקי לצמיתות' }))

    await waitFor(() => expect(screen.getByText('לא ניתן למחוק חשבון אדמין')).toBeInTheDocument())
    expect(mockSignOut).not.toHaveBeenCalled()
  })

  it('cancel returns to the initial state without deleting', async () => {
    mockUseAuth.mockReturnValue({ user: { uid: 'client-1', email: 'sarah@test.com' }, role: 'CLIENT', loading: false, signOut: mockSignOut })
    render(<SettingsPage />)
    await waitFor(() => expect(screen.getByText('אזור מסוכן')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'מחקי את החשבון שלי' }))
    fireEvent.click(screen.getByRole('button', { name: 'ביטול' }))

    expect(screen.queryByText('הזיני סיסמה לאישור')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'מחקי את החשבון שלי' })).toBeInTheDocument()
  })
})
