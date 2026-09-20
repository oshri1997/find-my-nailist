import { announcementBodySchema } from '@/lib/announcement-body'

describe('announcementBodySchema', () => {
  it('accepts a legacy plain string', () => {
    expect(announcementBodySchema.safeParse('תוכן פשוט').success).toBe(true)
  })

  it('rejects an empty string', () => {
    expect(announcementBodySchema.safeParse('   ').success).toBe(false)
  })

  it('accepts a well-formed rich doc with a heading, marks and a bullet list', () => {
    const doc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'כותרת' }] },
        { type: 'paragraph', content: [{ type: 'text', text: 'מודגש', marks: [{ type: 'bold' }] }] },
        {
          type: 'bulletList',
          content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'פריט' }] }] }],
        },
      ],
    }
    expect(announcementBodySchema.safeParse(doc).success).toBe(true)
  })

  it('rejects a node type outside the whitelist (e.g. an image or raw HTML node)', () => {
    const doc = { type: 'doc', content: [{ type: 'image', attrs: { src: 'x' } }] }
    expect(announcementBodySchema.safeParse(doc).success).toBe(false)
  })

  it('rejects nested lists (kept flat and light on purpose)', () => {
    const doc = {
      type: 'doc',
      content: [{
        type: 'bulletList',
        content: [{
          type: 'listItem',
          content: [{ type: 'bulletList', content: [] }],
        }],
      }],
    }
    expect(announcementBodySchema.safeParse(doc).success).toBe(false)
  })

  it('rejects a mark type outside the whitelist', () => {
    const doc = { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'x', marks: [{ type: 'strike' }] }] }] }
    expect(announcementBodySchema.safeParse(doc).success).toBe(false)
  })

  it('rejects an empty doc', () => {
    expect(announcementBodySchema.safeParse({ type: 'doc', content: [] }).success).toBe(false)
  })
})
