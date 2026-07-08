/**
 * Covers the new suspended-account branch in auth-provider.tsx's
 * onIdTokenChanged callback: when /api/auth/session POST returns 403
 * (account suspended after the session started), the client must sign out
 * and stop — not fall through to the normal "fetch /api/me/role and treat
 * this as a successful login" path.
 *
 * jsdom's window.location is fully locked down in this version (neither
 * `href` nor `.assign()` can be spied/mocked — both throw), so the actual
 * `window.location.assign(...)` redirect call is exercised for real here
 * (jsdom logs a harmless swallowed "not implemented: navigation" and no-ops)
 * rather than asserted on directly; the meaningful, testable behavior is
 * the sign-out + early-return.
 */
import { render, waitFor } from '@testing-library/react'
import { AuthProvider } from '@/components/auth/auth-provider'

const mockSignOutUser = jest.fn().mockResolvedValue(undefined)
let idTokenCallback: ((user: unknown) => void) | null = null

jest.mock('@/lib/firebase/client', () => ({
  initFirebase: jest.fn().mockResolvedValue({ auth: {} }),
}))

jest.mock('firebase/auth', () => ({
  onIdTokenChanged: jest.fn().mockImplementation((_auth, cb) => {
    idTokenCallback = cb
    return () => {}
  }),
}))

jest.mock('@/lib/firebase/auth-helpers', () => ({
  signOutUser: mockSignOutUser,
}))

describe('AuthProvider — suspended account handling', () => {
  let consoleErrorSpy: jest.SpyInstance

  beforeEach(() => {
    jest.clearAllMocks()
    idTokenCallback = null
    // Silences jsdom's harmless "Not implemented: navigation" log triggered
    // by the real (unmocked) window.location.assign() call in this branch.
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    consoleErrorSpy.mockRestore()
  })

  it('signs out and does not fetch /api/me/role when the session POST returns 403', async () => {
    const fetchMock = jest.fn().mockResolvedValue({ status: 403 } as Response)
    global.fetch = fetchMock

    render(<AuthProvider>child</AuthProvider>)

    await waitFor(() => expect(idTokenCallback).not.toBeNull())
    await idTokenCallback!({ uid: 'suspended-uid', getIdToken: async () => 'fake-token' })

    await waitFor(() => expect(mockSignOutUser).toHaveBeenCalled())
    // Only the /api/auth/session POST should have fired — the role fetch
    // that normally follows a successful session must never be reached.
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/session', expect.objectContaining({ method: 'POST' }))
  })

  it('does not sign out and does fetch /api/me/role when the session POST succeeds normally', async () => {
    const fetchMock = jest.fn().mockImplementation((url: string) => {
      if (url === '/api/auth/session') return Promise.resolve({ status: 200 } as Response)
      return Promise.resolve({ ok: false } as Response) // /api/me/role
    })
    global.fetch = fetchMock

    render(<AuthProvider>child</AuthProvider>)

    await waitFor(() => expect(idTokenCallback).not.toBeNull())
    await idTokenCallback!({ uid: 'ok-uid', getIdToken: async () => 'fake-token' })

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/me/role'))
    expect(mockSignOutUser).not.toHaveBeenCalled()
  })
})
