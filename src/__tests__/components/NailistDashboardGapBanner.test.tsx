/**
 * Covers the "unfillable gap" banner on the nailist dashboard home page —
 * a passive, informational nudge (never blocking) that surfaces gaps in her
 * schedule too short to fit any of her active services. See
 * src/lib/gap-detection.ts for the underlying pure computation, already
 * covered in isolation by gap-detection.test.ts; this file only covers the
 * wiring (fetch -> compute -> render) and the "never blocks" guarantee.
 */
import { render, screen, waitFor } from '@testing-library/react'
import NailistDashboard from '@/app/dashboard/nailist/page'
import { israelWallClockToUtc, todayInIsrael } from '@/lib/booking-utils'

// "Tomorrow" as Israel wall-clock sees it, so the fixture works regardless
// of the real-world DST state or system timezone the test happens to run
// under — matches how the production code itself resolves "today"/"now".
function tomorrowInIsrael(): string {
  const [y, m, d] = todayInIsrael().split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + 1)
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`
}
function isoAt(time: string): string {
  return israelWallClockToUtc(tomorrowInIsrael(), time).toISOString()
}

jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ user: { displayName: 'Oshri Test', email: 'oshri@test.com' } }),
}))

const fullProfile = { id: 'nailist-1', businessName: 'סטודיו יופי', city: 'תל אביב' }

function mockFetchResponses({
  services = [{ id: 's1', durationMinutes: 60 }],
  hours,
  appointments = [],
}: {
  services?: Array<{ id: string; durationMinutes: number }>
  hours?: Array<{ dayOfWeek: number; isActive: boolean; startTime: string; endTime: string }>
  appointments?: Array<{ id: string; startTime: string; endTime: string; status: string; price: number; currency: string; serviceName: string; clientProfileId: string }>
} = {}) {
  // Every day of the week open 09:00-17:00 unless the test overrides it —
  // avoids the suite being sensitive to which real-world weekday it runs on.
  const defaultHours = Array.from({ length: 7 }, (_, dayOfWeek) => ({
    dayOfWeek, isActive: true, startTime: '09:00', endTime: '17:00',
  }))

  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes('/api/me/nailist-profile')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: fullProfile }) } as Response)
    }
    if (url.includes('/api/portfolio')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: [{ id: 'p1' }] }) } as Response)
    }
    if (url.includes('/api/services')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: services }) } as Response)
    }
    if (url.includes('/api/working-hours')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: hours ?? defaultHours }) } as Response)
    }
    if (url.includes('/api/appointments')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: appointments }) } as Response)
    }
    if (url.includes('/api/nailists/')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: { reviews: [], avgRating: 0, reviewCount: 0 } }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
  })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('NailistDashboard — unfillable gap banner', () => {
  it('does not render the banner when there are no appointments at all', async () => {
    mockFetchResponses({ appointments: [] })
    render(<NailistDashboard />)

    await waitFor(() => expect(screen.getByText('הנה סקירה של העסק שלך')).toBeInTheDocument())
    expect(screen.queryByText(/פערים? בלוח הזמנים/)).not.toBeInTheDocument()
  })

  it('does not render the banner when the nailist has no active services to compare against', async () => {
    // Appointment shape that WOULD strand a gap if a 60-minute service
    // existed — but with zero services there's nothing to compare against.
    mockFetchResponses({
      services: [],
      appointments: [{
        id: 'a1', startTime: isoAt('09:30'), endTime: isoAt('10:30'), status: 'CONFIRMED',
        price: 100, currency: 'ILS', serviceName: 'לק ג׳ל', clientProfileId: 'c1',
      }],
    })
    render(<NailistDashboard />)

    await waitFor(() => expect(screen.getByText('הנה סקירה של העסק שלך')).toBeInTheDocument())
    expect(screen.queryByText(/פערים? בלוח הזמנים/)).not.toBeInTheDocument()
  })

  it('renders a banner with a link to add a service when a booking strands a gap', async () => {
    mockFetchResponses({
      services: [{ id: 's1', durationMinutes: 60 }],
      appointments: [{
        id: 'a1', startTime: isoAt('09:30'), endTime: isoAt('10:30'), status: 'CONFIRMED',
        price: 100, currency: 'ILS', serviceName: 'לק ג׳ל', clientProfileId: 'c1',
      }],
    })
    render(<NailistDashboard />)

    expect(await screen.findByText('יש לך פער בלוח הזמנים שלא מתאים לאף שירות')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: 'הוסיפי שירות קצר' })
    expect(link).toHaveAttribute('href', '/dashboard/nailist/services')
  })

  it('never blocks the rest of the dashboard from rendering when gaps exist', async () => {
    mockFetchResponses({
      appointments: [{
        id: 'a1', startTime: isoAt('09:30'), endTime: isoAt('10:30'), status: 'CONFIRMED',
        price: 100, currency: 'ILS', serviceName: 'לק ג׳ל', clientProfileId: 'c1',
      }],
    })
    render(<NailistDashboard />)

    await screen.findByText(/פער/)
    // Stats grid and upcoming-appointments card still render normally.
    expect(screen.getByText('תורים')).toBeInTheDocument()
    expect(screen.getByText('תורים קרובים')).toBeInTheDocument()
  })
})
