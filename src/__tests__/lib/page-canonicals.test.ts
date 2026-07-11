/**
 * Next.js metadata is inherited from the root layout for any field a page
 * doesn't set itself — including `alternates.canonical`. Before this fix,
 * these static pages had a title/description of their own but no canonical,
 * so they silently inherited the ROOT layout's canonical (the homepage URL),
 * telling search engines each of these pages IS the homepage. That can get a
 * page dropped from the index as a "duplicate."
 */
import { metadata as privacyMetadata } from '@/app/privacy/page'
import { metadata as termsMetadata } from '@/app/terms/page'
import { metadata as accessibilityMetadata } from '@/app/accessibility/page'
import { metadata as howItWorksMetadata } from '@/app/how-it-works/layout'

describe('static pages set their own canonical URL (not inherited from the root layout)', () => {
  it('privacy page', () => {
    expect(privacyMetadata.alternates?.canonical).toBe('/privacy')
  })

  it('terms page', () => {
    expect(termsMetadata.alternates?.canonical).toBe('/terms')
  })

  it('accessibility page', () => {
    expect(accessibilityMetadata.alternates?.canonical).toBe('/accessibility')
  })

  it('how-it-works page', () => {
    expect(howItWorksMetadata.alternates?.canonical).toBe('/how-it-works')
  })
})
