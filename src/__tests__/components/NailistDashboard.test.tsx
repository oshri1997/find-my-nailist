/**
 * Covers the "profile completion" card hiding once the checklist reaches 100%.
 * The old "quick actions" card (including the public-profile shortcut) was
 * removed from this page — see NailistLayoutMoreMenu.test.tsx for its
 * replacement in the dashboard layout's "עוד" menu.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import NailistDashboard from '@/app/dashboard/nailist/page'

jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ user: { displayName: 'Oshri Test', email: 'oshri@test.com' } }),
}))

const fullProfile = {
  id: 'nailist-1',
  businessName: 'סטודיו יופי',
  city: 'תל אביב',
  instagramUrl: 'https://instagram.com/studio',
}

type DashboardProfile = typeof fullProfile & {
  phoneNumber?: string
  whatsappPhone?: string
}

function mockFetchResponses({
  profile = fullProfile as DashboardProfile | null,
  hasServices = true,
  hasPhotos = true,
  hasHours = true,
}: {
  profile?: DashboardProfile | null
  hasServices?: boolean
  hasPhotos?: boolean
  hasHours?: boolean
} = {}) {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes('/api/me/nailist-profile')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: profile }) } as Response)
    }
    if (url.includes('/api/portfolio')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: hasPhotos ? [{ id: 'p1' }] : [] }) } as Response)
    }
    if (url.includes('/api/services')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: hasServices ? [{ id: 's1' }] : [] }) } as Response)
    }
    if (url.includes('/api/working-hours')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: hasHours ? [{ isActive: true }] : [] }) } as Response)
    }
    if (url.includes('/api/appointments')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: [] }) } as Response)
    }
    if (url.includes('/api/nailists/')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: { reviews: [], avgRating: 0, reviewCount: 0 } }) } as Response)
    }
    return Promise.resolve({ ok: true, json: async () => ({ data: null }) } as Response)
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  window.localStorage.clear()
})

describe('NailistDashboard — profile completion card', () => {
  it('hides the profile completion card once all checklist items are done', async () => {
    mockFetchResponses() // businessName+city+instagram+services+photos+hours -> 100%
    render(<NailistDashboard />)

    await waitFor(() => {
      expect(screen.queryByText('השלמת פרופיל')).not.toBeInTheDocument()
    })
  })

  it('shows the profile completion card when the checklist is incomplete', async () => {
    mockFetchResponses({ hasPhotos: false })
    render(<NailistDashboard />)

    // The card renders immediately at 0% before the async profile/services/photos/hours
    // fetches resolve — wait for the settled percentage, not just the heading's first paint.
    // JSX splits `{completionPct}% הושלם` into sibling text nodes — match on the <p>'s own text.
    await waitFor(() => {
      expect(
        screen.getByText((_, node) => node?.tagName === 'P' && node?.textContent === '80% הושלם')
      ).toBeInTheDocument()
    })
    expect(screen.getByText('השלמת פרופיל')).toBeInTheDocument()
  })

  it('no longer renders the old "quick actions" card', async () => {
    mockFetchResponses()
    render(<NailistDashboard />)

    await waitFor(() => {
      expect(screen.getByText('הנה סקירה של העסק שלך')).toBeInTheDocument()
    })
    expect(screen.queryByText('פעולות מהירות')).not.toBeInTheDocument()
    expect(screen.queryByText('צפייה בפרופיל ציבורי')).not.toBeInTheDocument()
  })
})

describe('NailistDashboard — verification contact reminder', () => {
  const reminderKey = 'nailist-verification-contact-reminder:nailist-1'

  it('shows only when both phone and WhatsApp are missing', async () => {
    mockFetchResponses({ profile: { ...fullProfile, phoneNumber: '', whatsappPhone: '   ' } })
    render(<NailistDashboard />)

    expect(await screen.findByRole('dialog', { name: 'עוד צעד קטן לתג אימות' })).toBeInTheDocument()
    expect(screen.getByText('כדי להיות זכאית לתג אימות, חסר בפרופיל שלך מספר טלפון או WhatsApp.')).toBeInTheDocument()
  })

  it.each([
    ['phone number', { phoneNumber: '0501234567' }],
    ['WhatsApp number', { whatsappPhone: '0501234567' }],
  ])('does not show when profile has a %s', async (_, contact) => {
    mockFetchResponses({ profile: { ...fullProfile, ...contact } })
    render(<NailistDashboard />)

    await waitFor(() => expect(screen.getByText('הנה סקירה של העסק שלך')).toBeInTheDocument())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('saves a seven-day reminder when asked later', async () => {
    mockFetchResponses()
    render(<NailistDashboard />)

    fireEvent.click(await screen.findByRole('button', { name: 'הזכירי לי מאוחר יותר' }))

    const preference = JSON.parse(window.localStorage.getItem(reminderKey) ?? '{}')
    expect(preference.nextPromptAt).toBeGreaterThan(Date.now() + (6 * 24 * 60 * 60 * 1000))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not show again after permanent dismissal', async () => {
    mockFetchResponses()
    const { unmount } = render(<NailistDashboard />)
    fireEvent.click(await screen.findByRole('button', { name: 'לא להציג שוב' }))
    unmount()

    render(<NailistDashboard />)
    await waitFor(() => expect(screen.getByText('הנה סקירה של העסק שלך')).toBeInTheDocument())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows again after reminder expiry', async () => {
    window.localStorage.setItem(reminderKey, JSON.stringify({ nextPromptAt: Date.now() - 1 }))
    mockFetchResponses()
    render(<NailistDashboard />)

    expect(await screen.findByRole('dialog', { name: 'עוד צעד קטן לתג אימות' })).toBeInTheDocument()
  })

  it.each(['null', '"not an object"', '{broken json'])('ignores invalid stored preference: %s', async (stored) => {
    window.localStorage.setItem(reminderKey, stored)
    mockFetchResponses()
    render(<NailistDashboard />)

    expect(await screen.findByRole('dialog', { name: 'עוד צעד קטן לתג אימות' })).toBeInTheDocument()
  })

  it('focuses, traps Tab, and restores focus when closed with Escape', async () => {
    const previousFocus = document.createElement('button')
    document.body.appendChild(previousFocus)
    previousFocus.focus()
    mockFetchResponses()
    render(<NailistDashboard />)

    const cta = await screen.findByRole('link', { name: 'להוספת פרטי קשר' })
    const dismiss = screen.getByRole('button', { name: 'לא להציג שוב' })
    expect(document.activeElement).toBe(cta)

    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(dismiss)
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(cta)

    fireEvent.keyDown(document, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(document.activeElement).toBe(previousFocus)
    expect(JSON.parse(window.localStorage.getItem(reminderKey) ?? '{}').dismissed).not.toBe(true)
    previousFocus.remove()
  })

  it('links to contact settings and records a short CTA cooldown', async () => {
    mockFetchResponses()
    render(<NailistDashboard />)

    const link = await screen.findByRole('link', { name: 'להוספת פרטי קשר' })
    expect(link).toHaveAttribute('href', '/dashboard/nailist/settings')
    fireEvent.click(link)

    const preference = JSON.parse(window.localStorage.getItem(reminderKey) ?? '{}')
    expect(preference.nextPromptAt).toBeGreaterThan(Date.now())
  })
})
