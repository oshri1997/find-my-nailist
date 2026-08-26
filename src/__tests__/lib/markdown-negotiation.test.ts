import { prefersMarkdown, buildHomepageMarkdown } from '@/lib/markdown-negotiation'

describe('prefersMarkdown', () => {
  it('is false when there is no Accept header', () => {
    expect(prefersMarkdown(null)).toBe(false)
    expect(prefersMarkdown(undefined)).toBe(false)
  })

  it('is true for a bare Accept: text/markdown', () => {
    expect(prefersMarkdown('text/markdown')).toBe(true)
  })

  it('is true when markdown is listed with an equal or higher q-value than html', () => {
    expect(prefersMarkdown('text/markdown, text/html;q=0.9')).toBe(true)
    expect(prefersMarkdown('text/markdown;q=1.0, text/html;q=1.0')).toBe(true)
  })

  it('is false when html is preferred over markdown', () => {
    expect(prefersMarkdown('text/html, text/markdown;q=0.5')).toBe(false)
  })

  it('is false for a typical browser Accept header with no markdown mention', () => {
    expect(prefersMarkdown('text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8')).toBe(false)
  })

  it('is false when markdown is explicitly excluded via q=0', () => {
    expect(prefersMarkdown('text/markdown;q=0, text/html')).toBe(false)
  })

  it('is true when markdown is matched via a text/* wildcard', () => {
    expect(prefersMarkdown('text/*')).toBe(true)
  })

  it('is false for a bare */* — the default most HTTP clients (curl, browsers) send, must not be treated as an explicit markdown request', () => {
    expect(prefersMarkdown('*/*')).toBe(false)
  })
})

describe('buildHomepageMarkdown', () => {
  const markdown = buildHomepageMarkdown()

  it('starts with a single top-level heading (the real homepage H1 text)', () => {
    expect(markdown.trimStart().startsWith('# מצאי את הנייליסטית המושלמת עבורך')).toBe(true)
  })

  it('is well over the 500-character minimum raw-HTML/content threshold', () => {
    expect(markdown.length).toBeGreaterThan(500)
  })

  it('links to the other machine-readable resources', () => {
    expect(markdown).toContain('https://nailistiot.fun/sitemap.xml')
    expect(markdown).toContain('https://nailistiot.fun/llms.txt')
  })
})
