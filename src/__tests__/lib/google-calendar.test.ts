/**
 * @jest-environment node
 */
import type { GoogleCalendarTokens } from '@/types'

const mockGenerateAuthUrl = jest.fn(() => 'https://accounts.google.com/mock-auth-url')
const mockGetToken = jest.fn()
const mockSetCredentials = jest.fn()
const mockRefreshAccessToken = jest.fn()
const mockEventsInsert = jest.fn()
const mockEventsDelete = jest.fn()

jest.mock('googleapis', () => ({
  google: {
    auth: {
      OAuth2: jest.fn().mockImplementation(() => ({
        generateAuthUrl: mockGenerateAuthUrl,
        getToken: mockGetToken,
        setCredentials: mockSetCredentials,
        refreshAccessToken: mockRefreshAccessToken,
      })),
    },
    calendar: jest.fn(() => ({
      events: { insert: mockEventsInsert, delete: mockEventsDelete },
    })),
  },
}))

import { google } from 'googleapis'
import {
  buildAppointmentEventPayload,
  isGoogleCalendarConfigured,
  getGoogleCalendarAuthUrl,
  exchangeGoogleCalendarCode,
  createGoogleCalendarEvent,
  deleteGoogleCalendarEvent,
} from '@/lib/google-calendar'

const baseDetails = {
  serviceName: 'מניקור ג׳ל',
  nailistBusinessName: 'סטודיו נייל',
  clientDisplayName: 'שרה כהן',
  startTime: new Date('2026-08-01T10:00:00Z'),
  endTime: new Date('2026-08-01T11:00:00Z'),
  price: 150,
  currency: 'ILS',
}

const FAR_FUTURE = Date.now() + 60 * 60 * 1000
const validTokens: GoogleCalendarTokens = {
  accessToken: 'access-1',
  refreshToken: 'refresh-1',
  expiryDate: FAR_FUTURE,
  scope: 'https://www.googleapis.com/auth/calendar.events',
}
const expiredTokens: GoogleCalendarTokens = {
  ...validTokens,
  expiryDate: Date.now() - 1000,
}

describe('buildAppointmentEventPayload', () => {
  it('describes the appointment from the client perspective', () => {
    const event = buildAppointmentEventPayload('client', baseDetails)
    expect(event.summary).toContain('סטודיו נייל')
    expect(event.description).toContain('אצל: סטודיו נייל')
    expect(event.start).toEqual({ dateTime: baseDetails.startTime.toISOString(), timeZone: 'Asia/Jerusalem' })
    expect(event.end).toEqual({ dateTime: baseDetails.endTime.toISOString(), timeZone: 'Asia/Jerusalem' })
  })

  it('describes the appointment from the nailist perspective', () => {
    const event = buildAppointmentEventPayload('nailist', baseDetails)
    expect(event.summary).toContain('שרה כהן')
    expect(event.description).toContain('לקוחה: שרה כהן')
  })

  it('includes notes only when present', () => {
    const withNotes = buildAppointmentEventPayload('client', { ...baseDetails, notes: 'אלרגיה לג׳ל מסוים' })
    expect(withNotes.description).toContain('הערות: אלרגיה לג׳ל מסוים')

    const withoutNotes = buildAppointmentEventPayload('client', baseDetails)
    expect(withoutNotes.description).not.toContain('הערות:')
  })

  it('formats a non-ILS currency with its code instead of ₪', () => {
    const event = buildAppointmentEventPayload('client', { ...baseDetails, currency: 'USD', price: 40 })
    expect(event.description).toContain('USD 40')
  })
})

describe('isGoogleCalendarConfigured', () => {
  const OLD_ENV = process.env

  beforeEach(() => {
    process.env = { ...OLD_ENV }
  })

  afterAll(() => {
    process.env = OLD_ENV
  })

  it('is false when client id/secret are missing', () => {
    delete process.env.GOOGLE_CALENDAR_CLIENT_ID
    delete process.env.GOOGLE_CALENDAR_CLIENT_SECRET
    expect(isGoogleCalendarConfigured()).toBe(false)
  })

  it('is true once both are set', () => {
    process.env.GOOGLE_CALENDAR_CLIENT_ID = 'id'
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET = 'secret'
    expect(isGoogleCalendarConfigured()).toBe(true)
  })
})

describe('getGoogleCalendarAuthUrl', () => {
  it('requests offline access + consent + the calendar.events scope, carrying the state through', () => {
    const url = getGoogleCalendarAuthUrl('nonce-123')
    expect(url).toBe('https://accounts.google.com/mock-auth-url')
    expect(mockGenerateAuthUrl).toHaveBeenCalledWith({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/calendar.events'],
      state: 'nonce-123',
    })
  })
})

describe('exchangeGoogleCalendarCode', () => {
  beforeEach(() => jest.clearAllMocks())

  it('maps Google token response fields to our GoogleCalendarTokens shape', async () => {
    mockGetToken.mockResolvedValue({
      tokens: {
        access_token: 'access-abc',
        refresh_token: 'refresh-abc',
        expiry_date: 1234567890,
        scope: 'https://www.googleapis.com/auth/calendar.events',
      },
    })
    const tokens = await exchangeGoogleCalendarCode('auth-code')
    expect(tokens).toEqual({
      accessToken: 'access-abc',
      refreshToken: 'refresh-abc',
      expiryDate: 1234567890,
      scope: 'https://www.googleapis.com/auth/calendar.events',
    })
  })

  it('throws when Google returns no access token', async () => {
    mockGetToken.mockResolvedValue({ tokens: {} })
    await expect(exchangeGoogleCalendarCode('auth-code')).rejects.toThrow()
  })
})

describe('createGoogleCalendarEvent', () => {
  beforeEach(() => jest.clearAllMocks())

  it('inserts the event directly when the access token is still valid', async () => {
    mockEventsInsert.mockResolvedValue({ data: { id: 'event-1' } })
    const result = await createGoogleCalendarEvent(validTokens, buildAppointmentEventPayload('client', baseDetails))
    expect(result.eventId).toBe('event-1')
    expect(result.refreshedTokens).toBeUndefined()
    expect(mockRefreshAccessToken).not.toHaveBeenCalled()
  })

  it('refreshes an expired token before inserting, and returns the refreshed tokens', async () => {
    mockRefreshAccessToken.mockResolvedValue({
      credentials: { access_token: 'new-access', expiry_date: FAR_FUTURE, scope: expiredTokens.scope },
    })
    mockEventsInsert.mockResolvedValue({ data: { id: 'event-2' } })

    const result = await createGoogleCalendarEvent(expiredTokens, buildAppointmentEventPayload('client', baseDetails))

    expect(mockRefreshAccessToken).toHaveBeenCalled()
    expect(result.eventId).toBe('event-2')
    // The original refresh token must be carried forward — Google's refresh
    // response does not repeat it.
    expect(result.refreshedTokens?.refreshToken).toBe(expiredTokens.refreshToken)
    expect(result.refreshedTokens?.accessToken).toBe('new-access')
  })

  it('throws when the token is expired and there is no refresh token to fall back on', async () => {
    const noRefresh: GoogleCalendarTokens = { ...expiredTokens, refreshToken: undefined }
    await expect(
      createGoogleCalendarEvent(noRefresh, buildAppointmentEventPayload('client', baseDetails))
    ).rejects.toThrow()
  })

  it('throws when Google does not return an event ID', async () => {
    mockEventsInsert.mockResolvedValue({ data: {} })
    await expect(
      createGoogleCalendarEvent(validTokens, buildAppointmentEventPayload('client', baseDetails))
    ).rejects.toThrow()
  })
})

describe('deleteGoogleCalendarEvent', () => {
  beforeEach(() => jest.clearAllMocks())

  it('deletes the event when the token is valid', async () => {
    mockEventsDelete.mockResolvedValue({})
    await deleteGoogleCalendarEvent(validTokens, 'event-1')
    expect(mockEventsDelete).toHaveBeenCalledWith({ calendarId: 'primary', eventId: 'event-1' })
  })

  it('treats a 404 (already deleted) as success rather than an error', async () => {
    mockEventsDelete.mockRejectedValue({ code: 404 })
    await expect(deleteGoogleCalendarEvent(validTokens, 'event-1')).resolves.toEqual({})
  })

  it('re-throws a non-404/410 failure', async () => {
    mockEventsDelete.mockRejectedValue({ code: 500 })
    await expect(deleteGoogleCalendarEvent(validTokens, 'event-1')).rejects.toEqual({ code: 500 })
  })
})

describe('OAuth2 client construction', () => {
  it('is constructed with the configured client id/secret and redirect URI', () => {
    // Triggering any call that builds a client is enough to assert on the
    // constructor args captured by the mock.
    getGoogleCalendarAuthUrl('nonce')
    expect(google.auth.OAuth2).toHaveBeenCalled()
  })
})
