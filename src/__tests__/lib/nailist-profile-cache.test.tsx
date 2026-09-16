/**
 * The dashboard layout and every dashboard page each used to call
 * GET /api/me/nailist-profile on their own, so one navigation through the
 * dashboard issued the same request over and over. That endpoint is not a pure
 * read — it back-fills photoUrl and can auto-create a profile — so the
 * duplicates cost Firestore writes as well as reads.
 *
 * These tests pin the sharing behaviour that removed the duplicates.
 */
import { render as rtlRender, screen, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import {
  useNailistProfile,
  useInvalidateNailistProfile,
  NAILIST_PROFILE_QUERY_KEY,
} from '@/lib/hooks/use-nailist-profile'

function makeClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

function renderWithClient(ui: ReactNode, client: QueryClient) {
  return rtlRender(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

function profileRequestCount() {
  return (global.fetch as jest.Mock).mock.calls.filter(([url]: [string]) =>
    String(url).includes('/api/me/nailist-profile')
  ).length
}

function ProfileProbe({ testId }: { testId: string }) {
  const { data } = useNailistProfile()
  return <span data-testid={testId}>{data?.id ?? 'none'}</span>
}

function InvalidateButton() {
  const invalidate = useInvalidateNailistProfile()
  return <button onClick={() => void invalidate()}>invalidate</button>
}

beforeEach(() => {
  jest.clearAllMocks()
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (String(url).includes('/api/me/nailist-profile')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: { id: 'profile-1' } }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
  })
})

describe('nailist profile request sharing', () => {
  it('serves several consumers on one page from a single request', async () => {
    // Stand-in for the real pairing: the dashboard layout needs the profile id
    // for its public-profile link while the page inside it needs the same
    // profile. Before the shared hook this was two identical requests.
    renderWithClient(
      <>
        <ProfileProbe testId="layout" />
        <ProfileProbe testId="page" />
        <ProfileProbe testId="widget" />
      </>,
      makeClient()
    )

    await waitFor(() => expect(screen.getByTestId('layout')).toHaveTextContent('profile-1'))
    expect(screen.getByTestId('page')).toHaveTextContent('profile-1')
    expect(screen.getByTestId('widget')).toHaveTextContent('profile-1')

    expect(profileRequestCount()).toBe(1)
  })

  it('does not re-request when a consumer unmounts and mounts again', async () => {
    // Navigating between dashboard pages unmounts one page and mounts the next,
    // which is exactly this: the second mount must be served from cache.
    const client = makeClient()

    const { unmount } = renderWithClient(<ProfileProbe testId="first" />, client)
    await waitFor(() => expect(screen.getByTestId('first')).toHaveTextContent('profile-1'))
    expect(profileRequestCount()).toBe(1)

    unmount()

    renderWithClient(<ProfileProbe testId="second" />, client)
    await waitFor(() => expect(screen.getByTestId('second')).toHaveTextContent('profile-1'))

    expect(profileRequestCount()).toBe(1)
  })

  it('re-requests after an invalidation so a saved change is not served stale', async () => {
    const client = makeClient()

    renderWithClient(
      <>
        <ProfileProbe testId="probe" />
        <InvalidateButton />
      </>,
      client
    )
    await waitFor(() => expect(screen.getByTestId('probe')).toHaveTextContent('profile-1'))
    expect(profileRequestCount()).toBe(1)

    await act(async () => {
      await client.invalidateQueries({ queryKey: NAILIST_PROFILE_QUERY_KEY })
    })

    await waitFor(() => expect(profileRequestCount()).toBe(2))
  })

  it('does not retry an expired session, which would multiply the traffic', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401 } as Response)

    function ErrorProbe() {
      const { isError } = useNailistProfile()
      return <span data-testid="state">{isError ? 'error' : 'pending'}</span>
    }

    renderWithClient(<ErrorProbe />, makeClient())

    await waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent('error'))
    expect(profileRequestCount()).toBe(1)
  })

  it('skips the request entirely while disabled', async () => {
    function DisabledProbe() {
      const { data } = useNailistProfile({ enabled: false })
      return <span data-testid="disabled">{data?.id ?? 'none'}</span>
    }

    renderWithClient(<DisabledProbe />, makeClient())

    await waitFor(() => expect(screen.getByTestId('disabled')).toHaveTextContent('none'))
    expect(profileRequestCount()).toBe(0)
  })
})
