/**
 * Covers the "verify nailist" toggle in the admin nailists table — click the
 * BadgeCheck button, PATCH /api/admin/nailists/[id] with the flipped
 * isVerified value, and optimistically update the row (adding/removing the
 * "מאומתת" badge next to the business name) once the request succeeds.
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import AdminNailistsPage from '@/app/admin/nailists/page'

const nailist = {
  id: 'n1', userId: 'u1', businessName: 'סטודיו יופי', city: 'תל אביב',
  isActive: true, isVerified: false, avgRating: 4.8, reviewCount: 12, createdAt: null,
}

let lastPatchBody: unknown = null

function mockFetch(patchOk = true) {
  global.fetch = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
    if (init?.method === 'PATCH' && /\/api\/admin\/nailists\/[^/]+$/.test(url)) {
      lastPatchBody = JSON.parse((init?.body as string) ?? '{}')
      return Promise.resolve(
        patchOk
          ? ({ ok: true, json: async () => ({ message: 'ok' }) } as Response)
          : ({ ok: false, json: async () => ({ error: 'שגיאה' }) } as Response)
      )
    }
    if (url.startsWith('/api/admin/nailists')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: [nailist] }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: [] }) } as Response)
  })
}

describe('AdminNailistsPage — verify toggle', () => {
  beforeEach(() => {
    lastPatchBody = null
  })

  it('PATCHes isVerified: true and shows the מאומתת badge when clicked on an unverified nailist', async () => {
    mockFetch()
    render(<AdminNailistsPage />)
    await waitFor(() => expect(screen.getByText('סטודיו יופי')).toBeInTheDocument())

    expect(screen.queryByText('מאומתת')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTitle('אמת נייליסטית'))

    await waitFor(() => {
      expect(lastPatchBody).toEqual({ isVerified: true })
    })
    expect(await screen.findByText('מאומתת')).toBeInTheDocument()
  })

  it('PATCHes isVerified: false and removes the badge when clicked on an already-verified nailist', async () => {
    global.fetch = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'PATCH' && /\/api\/admin\/nailists\/[^/]+$/.test(url)) {
        lastPatchBody = JSON.parse((init?.body as string) ?? '{}')
        return Promise.resolve({ ok: true, json: async () => ({ message: 'ok' }) } as Response)
      }
      if (url.startsWith('/api/admin/nailists')) {
        return Promise.resolve({ ok: true, json: async () => ({ data: [{ ...nailist, isVerified: true }] }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({ data: [] }) } as Response)
    })

    render(<AdminNailistsPage />)
    await waitFor(() => expect(screen.getByText('מאומתת')).toBeInTheDocument())

    fireEvent.click(screen.getByTitle('בטל אימות'))

    await waitFor(() => {
      expect(lastPatchBody).toEqual({ isVerified: false })
    })
    await waitFor(() => expect(screen.queryByText('מאומתת')).not.toBeInTheDocument())
  })

  it('shows a loading spinner on the verify button while the request is in flight', async () => {
    let resolvePatch!: (v: Response) => void
    global.fetch = jest.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (init?.method === 'PATCH' && /\/api\/admin\/nailists\/[^/]+$/.test(url)) {
        lastPatchBody = JSON.parse((init?.body as string) ?? '{}')
        return new Promise<Response>((resolve) => { resolvePatch = resolve })
      }
      if (url.startsWith('/api/admin/nailists')) {
        return Promise.resolve({ ok: true, json: async () => ({ data: [nailist] }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({ data: [] }) } as Response)
    })

    render(<AdminNailistsPage />)
    await waitFor(() => expect(screen.getByText('סטודיו יופי')).toBeInTheDocument())

    const verifyButton = screen.getByTitle('אמת נייליסטית')
    fireEvent.click(verifyButton)

    await waitFor(() => expect(verifyButton).toBeDisabled())

    resolvePatch({ ok: true, json: async () => ({ message: 'ok' }) } as Response)
    await waitFor(() => expect(verifyButton).not.toBeDisabled())
  })

  it('leaves the row unverified when the PATCH request fails', async () => {
    mockFetch(false)
    render(<AdminNailistsPage />)
    await waitFor(() => expect(screen.getByText('סטודיו יופי')).toBeInTheDocument())

    fireEvent.click(screen.getByTitle('אמת נייליסטית'))

    await waitFor(() => {
      expect(lastPatchBody).toEqual({ isVerified: true })
    })
    // No success response ever arrived, so the optimistic flip never happens.
    expect(screen.queryByText('מאומתת')).not.toBeInTheDocument()
  })
})
