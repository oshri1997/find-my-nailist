/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { middleware } from '@/middleware'

function makeRequest(url: string, opts: { accept?: string; cookie?: string } = {}): NextRequest {
  const headers: Record<string, string> = {}
  if (opts.accept) headers['accept'] = opts.accept
  const req = new NextRequest(url, { headers })
  if (opts.cookie) {
    Object.defineProperty(req, 'cookies', {
      get: () => ({ get: (name: string) => (name === 'auth-token' ? { value: opts.cookie } : undefined) }),
    })
  }
  return req
}

describe('middleware — markdown content negotiation on /', () => {
  it('serves text/markdown with Vary: Accept when Accept: text/markdown is sent', async () => {
    const res = middleware(makeRequest('http://localhost/', { accept: 'text/markdown' }))
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toBe('text/markdown; charset=utf-8')
    expect(res.headers.get('vary')).toContain('Accept')
    const body = await res.text()
    expect(body).toContain('# מצאי את הנייליסטית המושלמת עבורך')
  })

  it('lets a plain browser request pass through to the normal HTML render', () => {
    const res = middleware(makeRequest('http://localhost/', { accept: 'text/html,application/xhtml+xml' }))
    // NextResponse.next() carries no body/content-type of its own — the
    // real page render happens downstream. We don't set Vary here: Next.js's
    // App Router render pipeline unconditionally overwrites any custom Vary
    // value with its own RSC-routing tokens, so setting one here would have
    // no effect on the response the client actually receives.
    expect(res.headers.get('content-type')).not.toBe('text/markdown; charset=utf-8')
  })

  it('does not negotiate markdown on other routes', async () => {
    const res = middleware(makeRequest('http://localhost/search', { accept: 'text/markdown' }))
    expect(res.headers.get('content-type')).not.toBe('text/markdown; charset=utf-8')
  })

  it('does not negotiate markdown for a plain Accept header with no markdown preference', () => {
    const res = middleware(makeRequest('http://localhost/', { accept: 'text/html' }))
    expect(res.headers.get('content-type')).not.toBe('text/markdown; charset=utf-8')
  })
})

describe('middleware — existing auth redirects are unaffected', () => {
  it('redirects an unauthenticated request to a protected route to /login', () => {
    const res = middleware(makeRequest('http://localhost/dashboard/nailist'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('lets an authenticated request through to a protected route', () => {
    const res = middleware(makeRequest('http://localhost/dashboard/nailist', { cookie: 'valid-token' }))
    expect(res.status).not.toBe(307)
  })

  it('redirects an already-authenticated request away from /login', () => {
    const res = middleware(makeRequest('http://localhost/login', { cookie: 'valid-token' }))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost/')
  })
})
