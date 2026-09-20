/**
 * Covers auth-provider.tsx's visibilitychange handler: the auth-token
 * cookie carries a short-lived Firebase ID token, and Firebase's own
 * proactive refresh timer is a setTimeout that browsers throttle while a
 * tab is backgrounded — so a tab left open but unfocused for a while can
 * come back with an already-expired token, and every fetch made before the
 * throttled timer catches up fails (this is what admin panel users saw as
 * "שגיאה בטעינת הנתונים" after being idle and switching between admin
 * pages). Forcing a token refresh right when the tab becomes visible again
 * closes that gap.
 */
import { render, waitFor } from '@testing-library/react'
import { AuthProvider } from '@/components/auth/auth-provider'

jest.mock('next/navigation', () => ({ usePathname: () => '/login' }))

let idTokenCallback: ((user: unknown) => void) | null = null
const mockGetIdToken = jest.fn().mockResolvedValue(undefined)
const mockAuth: { currentUser: { getIdToken: jest.Mock } | null } = { currentUser: null }

jest.mock('@/lib/firebase/client', () => ({
  initFirebase: jest.fn().mockResolvedValue({ auth: mockAuth }),
}))

jest.mock('firebase/auth', () => ({
  onIdTokenChanged: jest.fn().mockImplementation((_auth, cb) => {
    idTokenCallback = cb
    return () => {}
  }),
}))

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { value: state, configurable: true })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('AuthProvider — refreshes the ID token when the tab becomes visible again', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    idTokenCallback = null
    mockGetIdToken.mockResolvedValue(undefined)
    mockAuth.currentUser = { getIdToken: mockGetIdToken }
    global.fetch = jest.fn().mockResolvedValue({ status: 200, ok: true, json: async () => ({}) } as Response)
  })

  it('force-refreshes the current user token when the document becomes visible', async () => {
    render(<AuthProvider>child</AuthProvider>)
    await waitFor(() => expect(idTokenCallback).not.toBeNull())

    setVisibility('visible')

    await waitFor(() => expect(mockGetIdToken).toHaveBeenCalledWith(true))
  })

  it('does not force-refresh when the tab is hidden', async () => {
    render(<AuthProvider>child</AuthProvider>)
    await waitFor(() => expect(idTokenCallback).not.toBeNull())

    setVisibility('hidden')
    await new Promise((r) => setTimeout(r, 0))

    expect(mockGetIdToken).not.toHaveBeenCalled()
  })

  it('does nothing when there is no signed-in user', async () => {
    mockAuth.currentUser = null
    render(<AuthProvider>child</AuthProvider>)
    await waitFor(() => expect(idTokenCallback).not.toBeNull())

    setVisibility('visible')
    await new Promise((r) => setTimeout(r, 0))

    expect(mockGetIdToken).not.toHaveBeenCalled()
  })
})
