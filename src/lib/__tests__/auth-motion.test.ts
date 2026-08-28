import { AUTH_TAB_TRANSITION, getAuthContentVariants } from '@/lib/auth-motion'

describe('login motion', () => {
  it('uses one short, restrained transition for switching content', () => {
    const variants = getAuthContentVariants(false)

    expect(variants.enter).toEqual(expect.objectContaining({ opacity: 0, y: 8, scale: 0.99 }))
    expect(variants.center).toEqual(expect.objectContaining({ opacity: 1, y: 0, scale: 1 }))
    expect(variants.exit).toEqual(expect.objectContaining({ opacity: 0, y: -4 }))
    expect(AUTH_TAB_TRANSITION.duration).toBeLessThanOrEqual(0.3)
  })

  it('removes movement, scale and blur when reduced motion is requested', () => {
    const variants = getAuthContentVariants(true)

    expect(variants.enter).toEqual({ opacity: 0 })
    expect(variants.center).toEqual({ opacity: 1, transition: { duration: 0 } })
    expect(variants.exit).toEqual({ opacity: 0, transition: { duration: 0 } })
  })
})
