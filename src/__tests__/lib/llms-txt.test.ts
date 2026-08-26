/**
 * public/llms.txt is a static file (served as-is by Next.js from /public),
 * so there's no route handler to exercise — this locks in its structure
 * directly so it can't silently regress (missing sections, broken links,
 * or the file disappearing entirely).
 */
import { readFileSync } from 'fs'
import { join } from 'path'

const llmsTxt = readFileSync(join(__dirname, '../../../public/llms.txt'), 'utf-8')

describe('public/llms.txt', () => {
  it('starts with a single H1 naming the product (Hebrew + English)', () => {
    expect(llmsTxt.trimStart().startsWith('# Nailistiot (נייליסטיות)')).toBe(true)
  })

  it('has a blockquote summary right after the title', () => {
    const lines = llmsTxt.trim().split('\n')
    const firstNonEmptyAfterTitle = lines.slice(1).find((l) => l.trim().length > 0)
    expect(firstNonEmptyAfterTitle?.startsWith('>')).toBe(true)
  })

  it('has an explicit, specific "when to use this" section (not generic marketing copy)', () => {
    expect(llmsTxt).toMatch(/## When to use this/i)
    expect(llmsTxt).toContain('Book, confirm, reschedule, or cancel a nail appointment')
    expect(llmsTxt).toContain('Not a fit for:')
  })

  it('links to the other machine-readable resources', () => {
    expect(llmsTxt).toContain('https://nailistiot.fun/sitemap.xml')
    expect(llmsTxt).toContain('https://nailistiot.fun/robots.txt')
    expect(llmsTxt).toContain('https://nailistiot.fun/search')
  })

  it('is honest about there being no public API rather than fabricating one', () => {
    expect(llmsTxt).toContain('no public API')
  })
})
