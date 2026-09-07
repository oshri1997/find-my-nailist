import { classifyVisitSource } from '@/lib/visit-analytics'

describe('classifyVisitSource', () => {
  it('classifies an empty referrer as direct', () => {
    expect(classifyVisitSource('')).toBe('direct')
  })

  it('classifies Google domains as google', () => {
    expect(classifyVisitSource('https://www.google.co.il/search?q=nails')).toBe('google')
  })

  it('classifies other valid and malformed referrers as other', () => {
    expect(classifyVisitSource('https://instagram.com/profile')).toBe('other')
    expect(classifyVisitSource('not a url')).toBe('other')
  })
})
