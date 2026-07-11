/**
 * robots.txt disallow entries are matched as literal path *prefixes* by
 * crawlers — a trailing slash like "/login/" only ever matches "/login/*"
 * and never the bare "/login" route itself (the actual page URL, since
 * Next.js route groups like (auth) don't add path segments). Every private
 * route below used to be crawlable/indexable at its bare URL despite being
 * listed in disallow, because every entry had a trailing slash.
 */
import robots from '@/app/robots'

function isBlocked(path: string, disallow: string[]) {
  return disallow.some((prefix) => path.startsWith(prefix))
}

describe('robots.ts', () => {
  const result = robots()
  const rules = result.rules as { userAgent: string; allow: string; disallow: string[] }

  it('points at the sitemap', () => {
    expect(result.sitemap).toBe('https://nailistiot.fun/sitemap.xml')
  })

  it('blocks the bare private routes, not just paths nested under them', () => {
    for (const path of [
      '/login',
      '/onboarding',
      '/dashboard',
      '/admin',
      '/my-appointments',
      '/my-favorites',
      '/forgot-password',
      '/appointments/confirmed',
    ]) {
      expect(isBlocked(path, rules.disallow)).toBe(true)
    }
  })

  it('also blocks paths nested under each private route', () => {
    for (const path of [
      '/login/',
      '/onboarding/welcome',
      '/dashboard/nailist',
      '/admin/users',
      '/my-appointments/anything',
    ]) {
      expect(isBlocked(path, rules.disallow)).toBe(true)
    }
  })

  it('does not block public, indexable routes', () => {
    for (const path of [
      '/',
      '/search',
      '/how-it-works',
      '/privacy',
      '/terms',
      '/accessibility',
      '/nailists/abc123',
      '/cities/tel-aviv',
    ]) {
      expect(isBlocked(path, rules.disallow)).toBe(false)
    }
  })
})
