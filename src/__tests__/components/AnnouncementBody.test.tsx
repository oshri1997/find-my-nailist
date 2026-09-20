/**
 * Covers AnnouncementBody: the shared renderer used by the modal, the
 * admin composer's list, and /whats-new. It has two input shapes — a plain
 * legacy string (every announcement published before the rich editor
 * existed) and the small whitelisted Tiptap-shaped doc the new editor
 * produces — and must render both without dangerouslySetInnerHTML.
 */
import { render, screen } from '@testing-library/react'
import { AnnouncementBody } from '@/components/announcements/AnnouncementBody'
import type { AnnouncementRichDoc } from '@/types'

describe('AnnouncementBody', () => {
  it('renders a legacy plain-string body as-is', () => {
    render(<AnnouncementBody body="אפשר להגדיר כמה חלונות זמינות ביום" />)
    expect(screen.getByText('אפשר להגדיר כמה חלונות זמינות ביום')).toBeInTheDocument()
  })

  it('renders bold and italic marks as real <strong>/<em> elements', () => {
    const doc: AnnouncementRichDoc = {
      type: 'doc',
      content: [{
        type: 'paragraph',
        content: [
          { type: 'text', text: 'טקסט ', },
          { type: 'text', text: 'מודגש', marks: [{ type: 'bold' }] },
          { type: 'text', text: ' ו', },
          { type: 'text', text: 'נטוי', marks: [{ type: 'italic' }] },
        ],
      }],
    }
    render(<AnnouncementBody body={doc} />)
    expect(screen.getByText('מודגש').tagName).toBe('STRONG')
    expect(screen.getByText('נטוי').tagName).toBe('EM')
  })

  it('renders a heading and a bullet list with all its items', () => {
    const doc: AnnouncementRichDoc = {
      type: 'doc',
      content: [
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: 'מה חדש' }] },
        {
          type: 'bulletList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'נקודה ראשונה' }] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'נקודה שנייה' }] }] },
          ],
        },
      ],
    }
    render(<AnnouncementBody body={doc} />)
    expect(screen.getByText('מה חדש')).toBeInTheDocument()
    expect(screen.getByText('נקודה ראשונה').closest('li')).toBeInTheDocument()
    expect(screen.getByText('נקודה שנייה').closest('li')).toBeInTheDocument()
    expect(screen.getByText('נקודה ראשונה').closest('ul')).toBeInTheDocument()
  })

  it('renders an ordered list as <ol>', () => {
    const doc: AnnouncementRichDoc = {
      type: 'doc',
      content: [{
        type: 'orderedList',
        content: [{ type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'שלב אחד' }] }] }],
      }],
    }
    render(<AnnouncementBody body={doc} />)
    expect(screen.getByText('שלב אחד').closest('ol')).toBeInTheDocument()
  })
})
