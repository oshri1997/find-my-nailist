'use client'

import { useEffect } from 'react'
import { useEditor, EditorContent, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Bold, Italic, Heading2, List, ListOrdered } from 'lucide-react'
import type { AnnouncementRichDoc } from '@/types'

const extensions = [
  StarterKit.configure({
    heading: { levels: [2, 3] },
    // A light, announcement-sized toolset — no blockquotes, code, strikes
    // or horizontal rules. Keeping the schema this narrow is also what lets
    // AnnouncementBody render the saved doc without ever needing to
    // sanitize raw HTML: every node type it can produce is already handled.
    blockquote: false,
    codeBlock: false,
    code: false,
    strike: false,
    horizontalRule: false,
    link: false,
  }),
]

function ToolbarButton({
  onClick,
  active,
  label,
  children,
}: {
  onClick: () => void
  active: boolean
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      title={label}
      className={`flex h-8 w-8 items-center justify-center rounded-lg border text-sm transition-colors ${
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-transparent text-muted-foreground hover:bg-muted hover:text-foreground'
      }`}
    >
      {children}
    </button>
  )
}

function Toolbar({ editor }: { editor: Editor }) {
  return (
    <div className="mb-1.5 flex flex-wrap items-center gap-1 border-b border-border pb-1.5">
      <ToolbarButton
        label="מודגש"
        active={editor.isActive('bold')}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="נטוי"
        active={editor.isActive('italic')}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="כותרת"
        active={editor.isActive('heading')}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        <Heading2 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="רשימת בולטים"
        active={editor.isActive('bulletList')}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        label="רשימה ממוספרת"
        active={editor.isActive('orderedList')}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>
    </div>
  )
}

interface AnnouncementRichTextEditorProps {
  onChange: (doc: AnnouncementRichDoc | null) => void
  /** Cleared content (e.g. after a successful publish) needs to be pushed back into the editor from outside it. */
  resetKey?: number
}

/**
 * A small WYSIWYG editor for the announcement body — bold/italic, a
 * heading, and bullet/numbered lists. Deliberately not a general-purpose
 * rich text editor: the extension set above is the same whitelist
 * AnnouncementBody knows how to render, so what the admin sees here is
 * exactly what publishing produces.
 */
export function AnnouncementRichTextEditor({ onChange, resetKey }: AnnouncementRichTextEditorProps) {
  const editor = useEditor({
    extensions,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: 'min-h-[110px] text-sm font-medium text-foreground focus:outline-none [&_ul]:list-disc [&_ul]:pr-5 [&_ol]:list-decimal [&_ol]:pr-5 [&_h3]:font-black [&_h3]:text-base',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.isEmpty ? null : (editor.getJSON() as AnnouncementRichDoc))
    },
  })

  useEffect(() => {
    if (resetKey === undefined) return
    editor?.commands.clearContent()
    // Only fires on an explicit reset (e.g. after publish) — not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey])

  if (!editor) return null

  return (
    <div
      dir="rtl"
      className="rounded-xl border border-border bg-card px-3 py-2.5 focus-within:border-primary"
    >
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}
