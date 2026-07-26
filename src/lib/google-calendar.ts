import { google, calendar_v3 } from 'googleapis'
import type { GoogleCalendarTokens } from '@/types'

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.events'
const TIME_ZONE = 'Asia/Jerusalem'

function redirectUri(): string {
  return (
    process.env.GOOGLE_CALENDAR_REDIRECT_URI ||
    `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/auth/google-calendar/callback`
  )
}

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CALENDAR_CLIENT_ID,
    process.env.GOOGLE_CALENDAR_CLIENT_SECRET,
    redirectUri()
  )
}

// Whether Calendar sync is configured at all — every call site treats a
// missing client ID/secret as "feature disabled", never as an error, since
// this is an optional integration (nothing else in the app depends on it).
export function isGoogleCalendarConfigured(): boolean {
  return !!process.env.GOOGLE_CALENDAR_CLIENT_ID && !!process.env.GOOGLE_CALENDAR_CLIENT_SECRET
}

// `access_type: offline` + `prompt: consent` are both required to get a
// refresh token back — Google only issues one on the *first* consent for a
// given account/scope pair, and only when prompt=consent forces the screen
// to show again (silently re-approving an already-granted scope returns no
// refresh_token at all).
export function getGoogleCalendarAuthUrl(state: string): string {
  const client = getOAuth2Client()
  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [CALENDAR_SCOPE],
    state,
  })
}

export async function exchangeGoogleCalendarCode(code: string): Promise<GoogleCalendarTokens> {
  const client = getOAuth2Client()
  const { tokens } = await client.getToken(code)
  if (!tokens.access_token) throw new Error('Google did not return an access token')
  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token ?? undefined,
    expiryDate: tokens.expiry_date ?? Date.now() + 55 * 60 * 1000,
    scope: tokens.scope ?? CALENDAR_SCOPE,
  }
}

// 60s safety margin — avoids sending a request with a token that expires
// mid-flight.
function isExpired(tokens: GoogleCalendarTokens): boolean {
  return Date.now() >= tokens.expiryDate - 60_000
}

// Refreshes only when needed and returns the (possibly unchanged) tokens
// alongside a flag so the caller knows whether to persist an update — Google
// omits refresh_token from a refresh response, so the original must be
// carried forward rather than overwritten with undefined.
async function ensureFreshTokens(
  tokens: GoogleCalendarTokens
): Promise<{ tokens: GoogleCalendarTokens; refreshed: boolean }> {
  if (!isExpired(tokens)) return { tokens, refreshed: false }
  if (!tokens.refreshToken) throw new Error('Google Calendar access token expired and no refresh token is on file')

  const client = getOAuth2Client()
  client.setCredentials({ refresh_token: tokens.refreshToken })
  const { credentials } = await client.refreshAccessToken()
  if (!credentials.access_token) throw new Error('Failed to refresh Google Calendar access token')

  return {
    refreshed: true,
    tokens: {
      accessToken: credentials.access_token,
      refreshToken: tokens.refreshToken,
      expiryDate: credentials.expiry_date ?? Date.now() + 55 * 60 * 1000,
      scope: credentials.scope ?? tokens.scope,
    },
  }
}

function calendarClient(tokens: GoogleCalendarTokens) {
  const client = getOAuth2Client()
  client.setCredentials({ access_token: tokens.accessToken })
  return google.calendar({ version: 'v3', auth: client })
}

export interface AppointmentEventDetails {
  serviceName: string
  nailistBusinessName: string
  clientDisplayName: string
  startTime: Date
  endTime: Date
  price: number
  currency: string
  notes?: string
}

// Same appointment, described from each side's own perspective — the client
// sees who she's visiting, the nailist sees who's coming in.
export function buildAppointmentEventPayload(
  perspective: 'client' | 'nailist',
  details: AppointmentEventDetails
): calendar_v3.Schema$Event {
  const symbol = details.currency === 'ILS' ? '₪' : `${details.currency} `
  const summary =
    perspective === 'client'
      ? `${details.serviceName} אצל ${details.nailistBusinessName}`
      : `${details.serviceName} — ${details.clientDisplayName}`

  const descriptionLines = [
    `שירות: ${details.serviceName}`,
    perspective === 'client'
      ? `אצל: ${details.nailistBusinessName}`
      : `לקוחה: ${details.clientDisplayName}`,
    `מחיר: ${symbol}${details.price}`,
    ...(details.notes ? [`הערות: ${details.notes}`] : []),
    '',
    'נקבע דרך נייליסטיות',
  ]

  return {
    summary,
    description: descriptionLines.join('\n'),
    start: { dateTime: details.startTime.toISOString(), timeZone: TIME_ZONE },
    end: { dateTime: details.endTime.toISOString(), timeZone: TIME_ZONE },
  }
}

// Returns the created event's ID, plus refreshed tokens when a refresh
// happened mid-call (the caller persists those back onto the user doc).
export async function createGoogleCalendarEvent(
  tokens: GoogleCalendarTokens,
  event: calendar_v3.Schema$Event
): Promise<{ eventId: string; refreshedTokens?: GoogleCalendarTokens }> {
  const { tokens: freshTokens, refreshed } = await ensureFreshTokens(tokens)
  const calendar = calendarClient(freshTokens)
  const res = await calendar.events.insert({ calendarId: 'primary', requestBody: event })
  if (!res.data.id) throw new Error('Google Calendar did not return an event ID')
  return { eventId: res.data.id, refreshedTokens: refreshed ? freshTokens : undefined }
}

// Best-effort delete — a 404/410 (already gone, e.g. the user removed it by
// hand) is treated as success rather than surfaced as an error.
export async function deleteGoogleCalendarEvent(
  tokens: GoogleCalendarTokens,
  eventId: string
): Promise<{ refreshedTokens?: GoogleCalendarTokens }> {
  const { tokens: freshTokens, refreshed } = await ensureFreshTokens(tokens)
  const calendar = calendarClient(freshTokens)
  try {
    await calendar.events.delete({ calendarId: 'primary', eventId })
  } catch (err) {
    const status = (err as { code?: number; response?: { status?: number } })?.code
      ?? (err as { response?: { status?: number } })?.response?.status
    if (status !== 404 && status !== 410) throw err
  }
  return { refreshedTokens: refreshed ? freshTokens : undefined }
}
