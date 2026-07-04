/**
 * Covers a bugfix: deleting a service used to remove it from local state
 * regardless of whether the DELETE request actually succeeded, silently
 * hiding a service that was never removed server-side on the next reload.
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import NailistServicesPage from '@/app/dashboard/nailist/services/page'

const service = {
  id: 'svc-1',
  name: 'מניקור ג׳ל',
  description: '',
  durationMinutes: 60,
  price: 120,
  currency: 'ILS',
}

function mockFetch(deleteOk: boolean) {
  global.fetch = jest.fn().mockImplementation((url: string, opts?: RequestInit) => {
    if (url.includes('/api/me/nailist-profile')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: { id: 'profile-1' } }) } as Response)
    }
    if (url.includes('/api/services') && (!opts || opts.method === undefined)) {
      return Promise.resolve({ ok: true, json: async () => ({ data: [service] }) } as Response)
    }
    if (opts?.method === 'DELETE') {
      return Promise.resolve({ ok: deleteOk, json: async () => ({ error: 'Failed' }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: [] }) } as Response)
  })
}

describe('NailistServicesPage — delete failure handling', () => {
  it('keeps the service visible and shows an error when the DELETE request fails', async () => {
    mockFetch(false)
    render(<NailistServicesPage />)

    await waitFor(() => expect(screen.getByText('מניקור ג׳ל')).toBeInTheDocument())

    fireEvent.click(screen.getByTitle('מחיקה'))

    await waitFor(() => {
      expect(screen.getByText('מחיקת השירות נכשלה, נסי שוב')).toBeInTheDocument()
    })
    expect(screen.getByText('מניקור ג׳ל')).toBeInTheDocument()
  })

  it('removes the service from the list when the DELETE request succeeds', async () => {
    mockFetch(true)
    render(<NailistServicesPage />)

    await waitFor(() => expect(screen.getByText('מניקור ג׳ל')).toBeInTheDocument())

    fireEvent.click(screen.getByTitle('מחיקה'))

    await waitFor(() => {
      expect(screen.queryByText('מניקור ג׳ל')).not.toBeInTheDocument()
    })
  })
})
