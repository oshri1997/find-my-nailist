/**
 * Covers the "profile completion" card hiding once the checklist reaches 100%.
 * The old "quick actions" card (including the public-profile shortcut) was
 * removed from this page — see NailistLayoutMoreMenu.test.tsx for its
 * replacement in the dashboard layout's "עוד" menu.
 */
import { fireEvent, render, screen, waitFor } from '@/__tests__/utils/render'
import NailistDashboard from '@/app/dashboard/nailist/page'

jest.mock('@/components/auth/auth-provider', () => ({
  useAuth: () => ({ user: { displayName: 'Oshri Test', email: 'oshri@test.com' }, setVerificationReminderActive: jest.fn() }),
}))

const fullProfile = {
  id: 'nailist-1',
  businessName: 'סטודיו יופי',
  city: 'תל אביב',
}

type DashboardProfile = typeof fullProfile & {
  phoneNumber?: string
}

const readyReadiness = { isReady: true, checks: [] }
const missingPhoneAndPhotosReadiness = {
  isReady: false,
  checks: [
    { key: 'phone', passed: false, missing: 'טלפון או וואטסאפ' },
    { key: 'portfolio', passed: false, missing: 'הוסיפי עוד 2 תמונות לתיק העבודות' },
  ],
}

function mockFetchResponses({
  profile = fullProfile as DashboardProfile | null,
  hasServices = true,
  hasPhotos = true,
  hasHours = true,
  readiness = readyReadiness,
}: {
  profile?: DashboardProfile | null
  hasServices?: boolean
  hasPhotos?: boolean
  hasHours?: boolean
  readiness?: typeof readyReadiness | typeof missingPhoneAndPhotosReadiness
} = {}) {
  global.fetch = jest.fn().mockImplementation((url: string) => {
    if (url.includes('/api/me/nailist-profile')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: profile }) } as Response)
    }
    if (url.includes('/api/me/verification-readiness')) {
      return Promise.resolve({ ok: true, json: async () => ({ data: readiness }) } as Response)
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
    mockFetchResponses() // businessName+city+services+photos+hours -> 100%
    render(<NailistDashboard />)

    await waitFor(() => {
      expect(screen.queryByText('השלמת פרופיל')).not.toBeInTheDocument()
    })
  })

  it('shows the profile completion card when the checklist is incomplete', async () => {
    mockFetchResponses({ hasPhotos: false })
    render(<NailistDashboard />)

    // The card only renders once the portfolio/services/hours checklist fetches
    // have actually settled, never at a transient 0%-before-data value — wait
    // for the settled percentage, not just the heading's first paint.
    // JSX splits `{completionPct}% הושלם` into sibling text nodes — match on the <p>'s own text.
    await waitFor(() => {
      expect(
        screen.getByText((_, node) => node?.tagName === 'P' && node?.textContent === '75% הושלם')
      ).toBeInTheDocument()
    })
    expect(screen.getByText('השלמת פרופיל')).toBeInTheDocument()
  })

  it('never flashes the card on first paint, before the checklist fetches have resolved', () => {
    mockFetchResponses() // businessName+city+services+photos+hours -> 100%
    render(<NailistDashboard />)

    // Checked synchronously, before any of the portfolio/services/hours fetches
    // have resolved: hasPhotos/hasServices/hasHours are still their false
    // initial state, which used to compute a false 0% and flash the card even
    // for an already-complete profile. It must stay absent until data loads.
    expect(screen.queryByText('השלמת פרופיל')).not.toBeInTheDocument()
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

describe('NailistDashboard — verification readiness reminder', () => {
  const reminderKey = 'nailist-verification-contact-reminder:nailist-1'

  it('lists every canonical missing verification requirement', async () => {
    mockFetchResponses({ readiness: missingPhoneAndPhotosReadiness })
    render(<NailistDashboard />)

    expect(await screen.findByRole('dialog', { name: 'עוד צעד קטן לתג אימות' })).toBeInTheDocument()
    expect(screen.getByText('טלפון או וואטסאפ')).toBeInTheDocument()
    expect(screen.getByText('הוסיפי עוד 2 תמונות לתיק העבודות')).toBeInTheDocument()
    expect(screen.getByText(/אינה מעניקה תג אוטומטית/)).toBeInTheDocument()
  })

  it('does not show when canonical readiness is complete', async () => {
    mockFetchResponses({ readiness: readyReadiness })
    render(<NailistDashboard />)

    await waitFor(() => expect(screen.getByText('הנה סקירה של העסק שלך')).toBeInTheDocument())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('saves a seven-day reminder when asked later', async () => {
    mockFetchResponses({ readiness: missingPhoneAndPhotosReadiness })
    render(<NailistDashboard />)

    fireEvent.click(await screen.findByRole('button', { name: 'הזכירי לי מאוחר יותר' }))

    const preference = JSON.parse(window.localStorage.getItem(reminderKey) ?? '{}')
    expect(preference.nextPromptAt).toBeGreaterThan(Date.now() + (6 * 24 * 60 * 60 * 1000))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('does not show again after permanent dismissal', async () => {
    mockFetchResponses({ readiness: missingPhoneAndPhotosReadiness })
    const { unmount } = render(<NailistDashboard />)
    fireEvent.click(await screen.findByRole('button', { name: 'לא להציג שוב' }))
    unmount()

    render(<NailistDashboard />)
    await waitFor(() => expect(screen.getByText('הנה סקירה של העסק שלך')).toBeInTheDocument())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows again after reminder expiry', async () => {
    window.localStorage.setItem(reminderKey, JSON.stringify({ nextPromptAt: Date.now() - 1 }))
    mockFetchResponses({ readiness: missingPhoneAndPhotosReadiness })
    render(<NailistDashboard />)

    expect(await screen.findByRole('dialog', { name: 'עוד צעד קטן לתג אימות' })).toBeInTheDocument()
  })

  it.each(['null', '"not an object"', '{broken json'])('ignores invalid stored preference: %s', async (stored) => {
    window.localStorage.setItem(reminderKey, stored)
    mockFetchResponses({ readiness: missingPhoneAndPhotosReadiness })
    render(<NailistDashboard />)

    expect(await screen.findByRole('dialog', { name: 'עוד צעד קטן לתג אימות' })).toBeInTheDocument()
  })

  it('focuses, traps Tab, and restores focus when closed with Escape', async () => {
    const previousFocus = document.createElement('button')
    document.body.appendChild(previousFocus)
    previousFocus.focus()
    mockFetchResponses({ readiness: missingPhoneAndPhotosReadiness })
    render(<NailistDashboard />)

    const cta = await screen.findByRole('link', { name: 'להשלמת הפרופיל' })
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

  it('links to profile settings and records a reminder cooldown', async () => {
    mockFetchResponses({ readiness: missingPhoneAndPhotosReadiness })
    render(<NailistDashboard />)

    const link = await screen.findByRole('link', { name: 'להשלמת הפרופיל' })
    expect(link).toHaveAttribute('href', '/dashboard/nailist/settings')
    fireEvent.click(link)

    const preference = JSON.parse(window.localStorage.getItem(reminderKey) ?? '{}')
    expect(preference.nextPromptAt).toBeGreaterThan(Date.now())
  })
})
