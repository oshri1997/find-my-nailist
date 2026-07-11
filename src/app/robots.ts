import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // No trailing slash: robots.txt disallow is a literal path-prefix match,
      // so "/login/" only blocks "/login/*" and leaves the bare "/login" page
      // (no trailing slash — the actual route) crawlable. "/login" as a
      // prefix correctly blocks both the bare route and everything nested
      // under it.
      disallow: [
        '/api',
        '/dashboard',
        '/onboarding',
        '/login',
        '/admin',
        '/my-appointments',
        '/my-favorites',
        '/forgot-password',
        '/appointments/confirmed',
      ],
    },
    sitemap: 'https://nailistiot.fun/sitemap.xml',
  }
}
