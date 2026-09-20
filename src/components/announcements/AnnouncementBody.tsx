import type { ReactNode } from 'react'
import type {
  AnnouncementBody as AnnouncementBodyValue,
  AnnouncementRichBlockNode,
  AnnouncementRichListItem,
  AnnouncementRichTextNode,
} from '@/types'

function renderInline(nodes: AnnouncementRichTextNode[] | undefined): ReactNode {
  if (!nodes?.length) return null
  return nodes.map((node, i) => {
    let el: ReactNode = node.text
    for (const mark of node.marks ?? []) {
      if (mark.type === 'bold') el = <strong className="font-black text-foreground">{el}</strong>
      if (mark.type === 'italic') el = <em>{el}</em>
    }
    return <span key={i}>{el}</span>
  })
}

function renderListItems(items: AnnouncementRichListItem[]) {
  return items.map((item, i) => (
    <li key={i}>{item.content.map((p, j) => <span key={j}>{renderInline(p.content)}</span>)}</li>
  ))
}

function renderBlock(node: AnnouncementRichBlockNode, key: number): ReactNode {
  switch (node.type) {
    case 'paragraph':
      return <p key={key} className="text-sm font-medium leading-6 text-muted-foreground">{renderInline(node.content)}</p>
    case 'heading':
      return (
        <p key={key} className="text-sm font-black text-foreground first:mt-0 mt-1">
          {renderInline(node.content)}
        </p>
      )
    case 'bulletList':
      return (
        <ul key={key} className="list-disc space-y-1 pr-5 text-sm font-medium leading-6 text-muted-foreground">
          {renderListItems(node.content)}
        </ul>
      )
    case 'orderedList':
      return (
        <ol key={key} className="list-decimal space-y-1 pr-5 text-sm font-medium leading-6 text-muted-foreground">
          {renderListItems(node.content)}
        </ol>
      )
    default:
      return null
  }
}

interface AnnouncementBodyProps {
  body: AnnouncementBodyValue
  /** Applied to the legacy plain-string case, to match each call site's existing spacing. */
  className?: string
}

/**
 * Renders an announcement's body — either the legacy plain string (every
 * announcement published before the rich editor existed) or the small,
 * whitelisted Tiptap-shaped doc the rich editor produces. Never uses
 * dangerouslySetInnerHTML: every node/mark type is mapped to JSX by hand,
 * so there is nothing here for an unrecognized shape to inject.
 */
export function AnnouncementBody({ body, className }: AnnouncementBodyProps) {
  const wrapperClassName = className ?? 'text-sm font-medium leading-6 text-muted-foreground'
  if (typeof body === 'string') {
    return <p className={wrapperClassName}>{body}</p>
  }
  return <div className={`${wrapperClassName} space-y-1.5`}>{body.content.map((node, i) => renderBlock(node, i))}</div>
}
