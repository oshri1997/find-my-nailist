/**
 * The how-it-works page already renders an FAQ accordion — this covers the
 * FAQPage JSON-LD the layout emits alongside it, built from the same shared
 * HOW_IT_WORKS_FAQS data so the structured data can never drift from what's
 * actually shown on the page.
 */
import { render } from '@testing-library/react'
import HowItWorksLayout from '@/app/how-it-works/layout'
import { HOW_IT_WORKS_FAQS } from '@/lib/how-it-works-faqs'

describe('how-it-works layout — FAQPage structured data', () => {
  it('emits a FAQPage JSON-LD script built from every FAQ shown on the page', () => {
    const { container } = render(
      <HowItWorksLayout>
        <div>content</div>
      </HowItWorksLayout>
    )

    const script = container.querySelector('script[type="application/ld+json"]')
    expect(script).not.toBeNull()

    const json = JSON.parse(script!.innerHTML)
    expect(json['@type']).toBe('FAQPage')
    expect(json.mainEntity).toHaveLength(HOW_IT_WORKS_FAQS.length)
    expect(json.mainEntity[0]).toEqual({
      '@type': 'Question',
      name: HOW_IT_WORKS_FAQS[0].q,
      acceptedAnswer: { '@type': 'Answer', text: HOW_IT_WORKS_FAQS[0].a },
    })
  })

  it('still renders its children', () => {
    const { getByText } = render(
      <HowItWorksLayout>
        <div>marker-content</div>
      </HowItWorksLayout>
    )
    expect(getByText('marker-content')).toBeInTheDocument()
  })
})
