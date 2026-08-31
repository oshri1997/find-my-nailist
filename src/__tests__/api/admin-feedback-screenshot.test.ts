/** @jest-environment node */
import { NextRequest } from 'next/server'

const verifyAdminMock = jest.fn()
const getSignedUrlMock = jest.fn()
const reports: Record<string, Record<string, unknown>> = {}

jest.mock('@/lib/admin-auth', () => ({
  verifyAdmin: (...args: unknown[]) => verifyAdminMock(...args),
  adminUnauthorized: () => new Response(JSON.stringify({ error: 'אין הרשאה' }), { status: 403 }),
}))
jest.mock('@/lib/firebase/admin', () => ({
  adminDb: () => ({ collection: () => ({ doc: (id: string) => ({ get: async () => ({ exists: Boolean(reports[id]), data: () => reports[id] }) }) }) }),
  adminStorage: () => ({ bucket: () => ({ file: () => ({ getSignedUrl: getSignedUrlMock }) }) }),
}))

import { GET } from '@/app/api/admin/feedback/[id]/screenshot/route'

function request() { return new NextRequest('http://localhost/api/admin/feedback/report-1/screenshot') }
function context(id = 'report-1') { return { params: Promise.resolve({ id }) } }

describe('GET /api/admin/feedback/[id]/screenshot', () => {
  beforeEach(() => {
    for (const key of Object.keys(reports)) delete reports[key]
    jest.clearAllMocks()
    verifyAdminMock.mockResolvedValue({ uid: 'admin-1', email: 'admin@example.com' })
    getSignedUrlMock.mockResolvedValue(['https://storage.example/private?signature=short-lived'])
  })

  it('rejects non-admins before reading the feedback document', async () => {
    verifyAdminMock.mockResolvedValue(null)
    const response = await GET(request(), context())
    expect(response.status).toBe(403)
    expect(getSignedUrlMock).not.toHaveBeenCalled()
  })

  it('returns 404 when the report does not have a valid screenshot', async () => {
    reports['report-1'] = { reporterUid: 'user-1' }
    const response = await GET(request(), context())
    expect(response.status).toBe(404)
    expect(getSignedUrlMock).not.toHaveBeenCalled()
  })

  it('returns a short-lived signed URL without revealing the Storage key', async () => {
    reports['report-1'] = {
      reporterUid: 'user-1',
      screenshotStorageKey: 'feedback/user-1/12345678-1234-1234-1234-123456789012.png',
    }
    const response = await GET(request(), context())
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body).toEqual({ data: { url: 'https://storage.example/private?signature=short-lived' } })
    expect(JSON.stringify(body)).not.toContain('feedback/user-1')
    expect(response.headers.get('cache-control')).toContain('no-store')
    expect(getSignedUrlMock).toHaveBeenCalledWith(expect.objectContaining({ action: 'read', expires: expect.any(Number) }))
  })
})
