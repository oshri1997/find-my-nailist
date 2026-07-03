/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'

const mockAdd = jest.fn().mockResolvedValue({ id: 'event-1' })
const mockCollection = jest.fn(() => ({ add: mockAdd }))

jest.mock('@/lib/firebase/admin', () => ({
  adminDb: jest.fn(() => ({ collection: mockCollection })),
}))

import { POST } from '@/app/api/analytics/search/route'

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/analytics/search', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('POST /api/analytics/search', () => {
  it('logs a search event with a query', async () => {
    const res = await POST(makeRequest({ query: 'רחובות', filter: 'הכל', resultsCount: 1 }))
    expect(res.status).toBe(201)
    expect(mockCollection).toHaveBeenCalledWith('searchEvents')
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'רחובות', filter: 'הכל', resultsCount: 1 })
    )
  })

  it('stores query as null when omitted (filter-only search)', async () => {
    await POST(makeRequest({ filter: "ג'ל", resultsCount: 3 }))
    expect(mockAdd).toHaveBeenCalledWith(
      expect.objectContaining({ query: null, filter: "ג'ל", resultsCount: 3 })
    )
  })

  it('rejects a missing filter field', async () => {
    const res = await POST(makeRequest({ query: 'תל אביב', resultsCount: 2 }))
    expect(res.status).toBe(400)
    expect(mockAdd).not.toHaveBeenCalled()
  })

  it('rejects a negative resultsCount', async () => {
    const res = await POST(makeRequest({ filter: 'הכל', resultsCount: -1 }))
    expect(res.status).toBe(400)
    expect(mockAdd).not.toHaveBeenCalled()
  })

  it('rejects an oversized query string', async () => {
    const res = await POST(makeRequest({ query: 'א'.repeat(200), filter: 'הכל', resultsCount: 0 }))
    expect(res.status).toBe(400)
    expect(mockAdd).not.toHaveBeenCalled()
  })

  it('does not require authentication', async () => {
    const res = await POST(makeRequest({ filter: 'הכל', resultsCount: 5 }))
    expect(res.status).toBe(201)
  })
})
