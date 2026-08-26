/**
 * The 404 page already returns a real HTTP 404 status (Next.js's built-in
 * not-found.tsx convention handles that automatically) — what it was
 * missing was a way for whoever/whatever lands here to recover: links to
 * search, the sitemap, and llms.txt, so an agent that hit a dead link has
 * somewhere machine-readable to look next instead of a dead end.
 */
import { render, screen } from '@testing-library/react'
import NotFound from '@/app/not-found'

describe('NotFound page', () => {
  it('shows the 404 heading and a link back to the homepage', () => {
    render(<NotFound />)
    expect(screen.getByRole('heading', { name: '404' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'חזרה לדף הבית' })).toHaveAttribute('href', '/')
  })

  it('includes recovery links to search, the sitemap, and llms.txt', () => {
    render(<NotFound />)
    expect(screen.getByRole('link', { name: 'חיפוש נייליסטיות' })).toHaveAttribute('href', '/search')
    expect(screen.getByRole('link', { name: 'מפת האתר' })).toHaveAttribute('href', '/sitemap.xml')
    expect(screen.getByRole('link', { name: 'llms.txt' })).toHaveAttribute('href', '/llms.txt')
  })
})
