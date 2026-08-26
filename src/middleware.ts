import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { buildHomepageMarkdown, prefersMarkdown } from '@/lib/markdown-negotiation'

const PROTECTED_PREFIXES = ['/dashboard', '/my-appointments', '/admin']
const AUTH_PATHS = ['/login']

// Routes that can be negotiated to text/markdown via Accept — currently
// just the homepage, mirrored by hand in buildHomepageMarkdown().
const MARKDOWN_NEGOTIABLE_PATHS = ['/']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get('auth-token')?.value

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))
  const isAuth = AUTH_PATHS.some((p) => pathname.startsWith(p))

  if (isProtected && !token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search)
    return NextResponse.redirect(loginUrl)
  }

  if (isAuth && token) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (
    request.method === 'GET' &&
    MARKDOWN_NEGOTIABLE_PATHS.includes(pathname) &&
    prefersMarkdown(request.headers.get('accept'))
  ) {
    return new NextResponse(buildHomepageMarkdown(), {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        // Tells caches the response varies by Accept (this route can also
        // serve text/html) — without it a CDN could serve the cached HTML
        // variant to the next agent that asks for markdown, or vice versa.
        'Vary': 'Accept, Accept-Encoding',
      },
    })
  }

  // Note: we deliberately don't try to set Vary here for the HTML
  // pass-through case. Next.js's App Router render pipeline
  // (base-server.js's setVaryHeader) unconditionally overwrites the Vary
  // header on every rendered page response with its own RSC-routing tokens
  // (rsc, next-router-state-tree, ...) — confirmed against this project's
  // pinned Next.js source, and true for both static and force-dynamic
  // rendering. There's no supported hook to add to that list, so a custom
  // Vary set here would silently never reach the client. The negotiated
  // markdown branch above is unaffected since it returns its own
  // NextResponse directly, bypassing that pipeline entirely.
  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
